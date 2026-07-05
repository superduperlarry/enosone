import { EmptyState } from "@enos/ui";

export default function ActivityPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-evergreen">Activity</h1>
      <p className="mt-1 font-body text-sm text-gray-500">
        Every event across all agents — attributed, append-only.
      </p>
      <div className="mt-8">
        <EmptyState
          title="No activity yet"
          description="Payments, approvals, and policy evaluations will appear here with full attribution. (Milestone 4)"
        />
      </div>
    </div>
  );
}
