import { Card, EmptyState, StatusBadge } from "@enos/ui";
import Link from "next/link";
import { listAgents } from "@/server/actions/agents";

export default async function AgentsPage() {
  const agents = await listAgents();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-evergreen">Agents</h1>
          <p className="mt-1 font-body text-sm text-gray-500">
            Your agents, their models, and their money — in one place.
          </p>
        </div>
        <Link
          href="/agents/new"
          className="rounded-full bg-evergreen px-6 py-2.5 font-ui text-sm font-medium text-white transition-colors hover:bg-evergreen-700"
        >
          New agent
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No agents yet"
            description="Create your first agent to give it a model, a prompt, and a spending policy."
            action={
              <Link
                href="/agents/new"
                className="rounded-full bg-lime px-6 py-2.5 font-ui text-sm font-medium text-evergreen-950 hover:bg-lime-300"
              >
                Create an agent
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/agents/${agent.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{agent.avatar}</span>
                  <StatusBadge status={agent.status} />
                </div>
                <h3 className="mt-3 font-ui text-lg font-medium text-evergreen">
                  {agent.displayName}
                </h3>
                {agent.description ? (
                  <p className="mt-1 line-clamp-2 font-body text-sm text-gray-500">
                    {agent.description}
                  </p>
                ) : null}
                <p className="mt-3 font-ui text-xs text-gray-400">
                  {agent.provider} · {agent.model}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
