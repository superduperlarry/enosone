/**
 * Wire types mirroring docs/agent_os_openapi.yaml (the contract).
 * Milestone 6 adds machine-generated types from the spec; these hand-mirrored
 * shapes are kept field-for-field identical so screens built on them survive
 * the swap unchanged.
 */

export type Money = {
  /** Decimal string. Never a float. */
  amount: string;
  /** ISO 4217 code. */
  currency: string;
};

// ── Policy ──────────────────────────────────────────────────────────

export type PolicyLimits = {
  per_transaction?: Money;
  daily?: Money;
  monthly?: Money;
  max_transactions_per_day?: number | null;
};

export type PolicyApprovals = {
  require_approval_above?: Money;
  require_approval_for_new_counterparties?: boolean;
  require_approval_for_cross_border?: boolean;
  auto_expire_hours?: number;
};

export type PolicyCreate = {
  limits: PolicyLimits;
  counterparty_allowlist?: string[] | null;
  verified_counterparties_only?: boolean;
  merchant_category_allowlist?: string[] | null;
  currency_allowlist?: string[] | null;
  approvals: PolicyApprovals;
};

export type Policy = PolicyCreate & {
  agent_id: string;
  version: number;
  created_at: string;
};

// ── Payments ────────────────────────────────────────────────────────

export type PaymentStatus =
  | "pending_approval"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "returned";

export type PaymentTimelineEntry = {
  status: string;
  at: string;
  detail?: string | null;
};

export type Payment = {
  id: string;
  agent_id: string;
  /** Attribution is never optional. */
  credential_id: string;
  counterparty_id: string;
  source_amount: Money;
  status: PaymentStatus;
  approval_id?: string | null;
  failure_reason?: string | null;
  rail?: string | null;
  reference?: string | null;
  purpose?: string | null;
  timeline: PaymentTimelineEntry[];
  created_at: string;
  completed_at?: string | null;
};

// ── Approvals ───────────────────────────────────────────────────────

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export type Approval = {
  id: string;
  agent_id: string;
  action_type: "payment" | "transfer" | "counterparty";
  action_id: string;
  trigger?: string;
  summary?: Record<string, unknown>;
  status: ApprovalStatus;
  decided_by?: string | null;
  decided_at?: string | null;
  note?: string | null;
  expires_at: string;
  created_at: string;
};

// ── Activity ────────────────────────────────────────────────────────

export type ActivityEvent = {
  id: string;
  /** Dot-notation, e.g. `payment.completed`, `policy.evaluation`. */
  type: string;
  agent_id?: string | null;
  credential_id?: string | null;
  resource?: { type: string; id: string };
  data?: Record<string, unknown>;
  occurred_at: string;
};

// ── Errors ──────────────────────────────────────────────────────────

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  request_id: string;
};
