import { Button, StatusBadge } from "@enos/ui";
import { notFound } from "next/navigation";
import { AgentForm } from "@/components/agent-form";
import {
  getAgent,
  setAgentStatus,
  updateAgent,
} from "@/server/actions/agents";
import { listProviderMeta } from "@/server/providers/registry";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) notFound();

  const update = updateAgent.bind(null, agent.id);
  const suspend = setAgentStatus.bind(null, agent.id, "suspended");
  const reactivate = setAgentStatus.bind(null, agent.id, "active");

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="font-display text-3xl text-evergreen">
          Edit {agent.displayName}
        </h1>
        <StatusBadge status={agent.status} />
      </div>

      <div className="mt-8">
        <AgentForm
          providers={listProviderMeta()}
          action={update}
          defaults={{
            displayName: agent.displayName,
            description: agent.description ?? undefined,
            avatar: agent.avatar,
            provider: agent.provider,
            model: agent.model,
            systemPrompt: agent.systemPrompt,
          }}
          submitLabel="Save changes"
        />
      </div>

      <div className="mt-10 max-w-xl rounded-card border border-evergreen-100 bg-white p-6">
        <h2 className="font-ui text-sm font-medium uppercase tracking-wider text-evergreen-700">
          Status
        </h2>
        <p className="mt-1 font-body text-sm text-gray-500">
          Suspending an agent freezes it immediately: chat stops and spending
          stops. Reversible any time — mirrors Agent OS suspend/reactivate.
        </p>
        <form
          action={agent.status === "active" ? suspend : reactivate}
          className="mt-4"
        >
          {agent.status === "active" ? (
            <Button type="submit" variant="danger" size="sm">
              Suspend agent
            </Button>
          ) : (
            <Button type="submit" size="sm">
              Reactivate agent
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
