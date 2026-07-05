"use client";

import { useChat } from "@ai-sdk/react";
import { Button, cx } from "@enos/ui";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cx("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 font-body text-sm",
          isUser
            ? "bg-evergreen text-white"
            : "border border-evergreen-100 bg-white text-ink",
        )}
      >
        {message.parts.map((part, i) =>
          part.type === "text" ? <span key={i}>{part.text}</span> : null,
        )}
      </div>
    </div>
  );
}

export function AgentChat({
  agentId,
  runId,
  initialMessages,
  disabled,
}: {
  agentId: string;
  runId?: string;
  initialMessages?: UIMessage[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [chatRunId] = useState(
    () => runId ?? `run_${crypto.randomUUID().replaceAll("-", "")}`,
  );
  const isNewRun = useRef(!runId);
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/agents/${agentId}/runs`,
        body: { runId: chatRunId },
      }),
    [agentId, chatRunId],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: chatRunId,
    transport,
    messages: initialMessages,
    onFinish: () => {
      if (isNewRun.current) {
        isNewRun.current = false;
        router.replace(`/agents/${agentId}?run=${chatRunId}`, {
          scroll: false,
        });
      }
      router.refresh(); // keep the run-history sidebar current
    },
  });

  const busy = status === "submitted" || status === "streaming";

  function submit() {
    const text = input.trim();
    if (!text || busy || disabled) return;
    setInput("");
    void sendMessage({ text });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="mt-12 text-center font-body text-sm text-gray-400">
            {disabled
              ? "This agent is suspended — reactivate it to chat."
              : "Say something to start a run. Every run is kept in this agent's history."}
          </p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {error ? (
          <p className="font-body text-sm text-danger">
            {error.message || "Something went wrong."}
          </p>
        ) : null}
      </div>
      <form
        className="flex gap-2 border-t border-evergreen-100 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? "Agent suspended" : "Message your agent…"}
          className="flex-1 rounded-full border border-evergreen-100 px-5 py-2.5 font-body text-sm outline-none focus:border-teal disabled:bg-gray-50"
        />
        <Button type="submit" disabled={busy || disabled || !input.trim()}>
          {busy ? "…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
