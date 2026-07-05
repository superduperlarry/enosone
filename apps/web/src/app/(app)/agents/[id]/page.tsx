import { StatusBadge, cx } from "@enos/ui";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import { AgentChat } from "@/components/agent-chat";
import { getAgent } from "@/server/actions/agents";
import { db } from "@/server/db";
import { runMessages, runs } from "@/server/db/schema";

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { id } = await params;
  const { run: activeRunId } = await searchParams;

  const agent = await getAgent(id);
  if (!agent) notFound();

  const agentRuns = await db
    .select()
    .from(runs)
    .where(eq(runs.agentId, agent.id))
    .orderBy(desc(runs.updatedAt))
    .limit(50);

  let initialMessages: UIMessage[] | undefined;
  if (activeRunId) {
    // Ownership check: the run must belong to this (user-scoped) agent.
    const [run] = await db
      .select({ id: runs.id })
      .from(runs)
      .where(and(eq(runs.id, activeRunId), eq(runs.agentId, agent.id)))
      .limit(1);
    if (run) {
      const rows = await db
        .select()
        .from(runMessages)
        .where(eq(runMessages.runId, run.id))
        .orderBy(runMessages.createdAt);
      initialMessages = rows.map((r) => ({
        id: r.id,
        role: r.role as UIMessage["role"],
        parts: JSON.parse(r.parts as string),
      }));
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{agent.avatar}</span>
          <div>
            <h1 className="font-display text-2xl text-evergreen">
              {agent.displayName}
            </h1>
            <p className="font-ui text-xs text-gray-400">
              {agent.provider} · {agent.model}
            </p>
          </div>
          <StatusBadge status={agent.status} />
        </div>
        <div className="flex gap-2">
          <Link
            href={`/agents/${agent.id}/spend`}
            className="rounded-full bg-lime px-4 py-1.5 font-ui text-sm font-medium text-evergreen-950 hover:bg-lime-300"
          >
            Pay for a service
          </Link>
          <Link
            href={`/agents/${agent.id}/policy`}
            className="rounded-full border border-evergreen-100 px-4 py-1.5 font-ui text-sm text-evergreen hover:bg-evergreen-50"
          >
            Policy
          </Link>
          <Link
            href={`/agents/${agent.id}/edit`}
            className="rounded-full border border-evergreen-100 px-4 py-1.5 font-ui text-sm text-evergreen hover:bg-evergreen-50"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <aside className="flex w-56 shrink-0 flex-col rounded-card border border-evergreen-100 bg-white">
          <div className="flex items-center justify-between border-b border-evergreen-100 px-4 py-3">
            <span className="font-ui text-xs uppercase tracking-wider text-gray-400">
              Runs
            </span>
            <Link
              href={`/agents/${agent.id}`}
              className="font-ui text-xs text-teal hover:underline"
            >
              + New
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {agentRuns.length === 0 ? (
              <p className="p-2 font-body text-xs text-gray-400">
                No runs yet.
              </p>
            ) : (
              agentRuns.map((run) => (
                <Link
                  key={run.id}
                  href={`/agents/${agent.id}?run=${run.id}`}
                  className={cx(
                    "block truncate rounded-lg px-3 py-2 font-body text-sm",
                    run.id === activeRunId
                      ? "bg-evergreen-50 text-evergreen"
                      : "text-gray-600 hover:bg-evergreen-50/50",
                  )}
                >
                  {run.title}
                </Link>
              ))
            )}
          </div>
        </aside>

        <div className="min-h-0 flex-1 rounded-card border border-evergreen-100 bg-surface">
          <AgentChat
            key={activeRunId ?? "new"}
            agentId={agent.id}
            runId={activeRunId}
            initialMessages={initialMessages}
            disabled={agent.status !== "active"}
          />
        </div>
      </div>
    </div>
  );
}
