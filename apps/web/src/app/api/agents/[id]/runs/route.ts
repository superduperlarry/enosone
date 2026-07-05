import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { newId } from "@/lib/ids";
import { auth } from "@/server/auth";
import { getKeyring } from "@/server/crypto/keyring";
import { db } from "@/server/db";
import { agents, modelKeys, runMessages, runs } from "@/server/db/schema";
import { getProvider } from "@/server/providers/registry";

const bodySchema = z.object({
  runId: z.string().regex(/^run_[\w-]{8,64}$/),
  messages: z.array(z.record(z.string(), z.unknown())).min(1),
});

function titleFrom(message: UIMessage): string {
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();
  return text.slice(0, 80) || "New run";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id: agentId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const { runId } = parsed.data;
  const messages = parsed.data.messages as unknown as UIMessage[];

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.userId, session.user.id)))
    .limit(1);
  if (!agent) return Response.json({ error: "not_found" }, { status: 404 });
  if (agent.status !== "active") {
    return Response.json(
      { error: "agent_suspended", message: "This agent is suspended." },
      { status: 403 },
    );
  }

  const [key] = await db
    .select()
    .from(modelKeys)
    .where(
      and(
        eq(modelKeys.userId, session.user.id),
        eq(modelKeys.provider, agent.provider),
      ),
    )
    .limit(1);
  if (!key) {
    return Response.json(
      {
        error: "missing_model_key",
        message: `Add your ${agent.provider} API key in Settings first.`,
      },
      { status: 409 },
    );
  }

  const adapter = getProvider(agent.provider);
  const model = adapter.createModel({
    apiKey: getKeyring().open(key.secretEnvelope),
    model: agent.model,
    baseUrl: key.baseUrl,
  });

  const lastMessage = messages[messages.length - 1];

  // Upsert the run, then persist the user turn before streaming.
  const existing = await db
    .select({ id: runs.id })
    .from(runs)
    .where(and(eq(runs.id, runId), eq(runs.userId, session.user.id)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(runs).values({
      id: runId,
      agentId: agent.id,
      userId: session.user.id,
      title: titleFrom(lastMessage),
    });
  } else {
    await db
      .update(runs)
      .set({ updatedAt: new Date() })
      .where(eq(runs.id, runId));
  }
  if (lastMessage.role === "user") {
    await db.insert(runMessages).values({
      id: lastMessage.id ?? newId("msg"),
      runId,
      role: "user",
      parts: JSON.stringify(lastMessage.parts),
    });
  }

  const result = streamText({
    model,
    system: agent.systemPrompt || undefined,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    onFinish: async ({ responseMessage }) => {
      await db.insert(runMessages).values({
        id: responseMessage.id ?? newId("msg"),
        runId,
        role: "assistant",
        parts: JSON.stringify(responseMessage.parts),
      });
      await db
        .update(runs)
        .set({ updatedAt: new Date() })
        .where(eq(runs.id, runId));
    },
  });
}
