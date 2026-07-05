import { AgentForm } from "@/components/agent-form";
import { createAgent } from "@/server/actions/agents";
import { listProviderMeta } from "@/server/providers/registry";

export default function NewAgentPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-evergreen">New agent</h1>
      <p className="mt-1 font-body text-sm text-gray-500">
        Pick a model, write the prompt. It starts with a deny-all spending
        policy — money comes later.
      </p>
      <div className="mt-8">
        <AgentForm
          providers={listProviderMeta()}
          action={createAgent}
          submitLabel="Create agent"
        />
      </div>
    </div>
  );
}
