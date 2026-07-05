import { EmptyState } from "@enos/ui";

export default function ApprovalsPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-evergreen">Approvals</h1>
      <p className="mt-1 font-body text-sm text-gray-500">
        Anything an agent wants to do above its limits waits here for you.
      </p>
      <div className="mt-8">
        <EmptyState
          title="Nothing waiting on you"
          description="When an agent exceeds a policy rule, the held action appears here — never an error. (Milestone 4)"
        />
      </div>
    </div>
  );
}
