import { EmptyState } from "@enos/ui";

export default function AgentsPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-evergreen">Agents</h1>
      <p className="mt-1 font-body text-sm text-gray-500">
        Your agents, their models, and their money — in one place.
      </p>
      <div className="mt-8">
        <EmptyState
          title="No agents yet"
          description="Create your first agent to give it a model, a prompt, and a spending policy. (Milestone 3)"
        />
      </div>
    </div>
  );
}
