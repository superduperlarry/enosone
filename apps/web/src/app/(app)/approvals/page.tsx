import { EmptyState } from "@enos/ui";
import { ApprovalCard } from "@/components/approval-card";
import { getAgentOs } from "@/server/agentos";
import { requireSession } from "@/server/session";

export default async function ApprovalsPage() {
  const session = await requireSession();
  const service = getAgentOs(session.user.id);
  const all = await service.listApprovals();
  const pending = all.filter((a) => a.status === "pending");
  const decided = all.filter((a) => a.status !== "pending").slice(0, 10);

  return (
    <div>
      <h1 className="font-display text-3xl text-evergreen">Approvals</h1>
      <p className="mt-1 font-body text-sm text-gray-500">
        Anything an agent wants to do above its limits waits here for you —
        held, never failed.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {pending.length === 0 ? (
          <EmptyState
            title="Nothing waiting on you"
            description="When an agent exceeds a policy rule, the held action appears here."
          />
        ) : (
          pending.map((a) => <ApprovalCard key={a.id} approval={a} />)
        )}
      </div>

      {decided.length > 0 ? (
        <div className="mt-10">
          <h2 className="font-ui text-sm font-medium uppercase tracking-wider text-gray-400">
            Recently decided
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            {decided.map((a) => (
              <ApprovalCard key={a.id} approval={a} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
