import { cx } from "./cx";

/**
 * Status vocabulary matches the /v1 spec enums (PaymentStatus, ApprovalStatus,
 * AgentStatus) so screens can pass statuses straight through.
 */
const toneByStatus: Record<string, string> = {
  // payments
  completed: "bg-evergreen-50 text-positive",
  processing: "bg-teal-100 text-evergreen-700",
  pending_approval: "bg-lime/20 text-caution",
  failed: "bg-red-50 text-danger",
  cancelled: "bg-gray-100 text-gray-500",
  returned: "bg-red-50 text-danger",
  // approvals
  pending: "bg-lime/20 text-caution",
  approved: "bg-evergreen-50 text-positive",
  rejected: "bg-red-50 text-danger",
  expired: "bg-gray-100 text-gray-500",
  // agents
  active: "bg-evergreen-50 text-positive",
  suspended: "bg-red-50 text-danger",
  deactivated: "bg-gray-100 text-gray-500",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-ui text-xs font-medium",
        toneByStatus[status] ?? "bg-gray-100 text-gray-600",
        className,
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
