import type { Money, PolicyCreate } from "@enos/agentos-client";
import { add, gt, isValidAmount } from "@/lib/money";

/**
 * Pure local mirror of the Agent OS policy semantics for the Phase A mock
 * backend. The real engine lives server-side in the /v1 API; this mirror
 * exists ONLY so the mock can reproduce the same three outcomes:
 *
 *  - allow → payment proceeds (201 semantics)
 *  - hold  → payment held + Approval raised (202 semantics — never an error)
 *  - deny  → hard policy block (403 `policy_denied`)
 *
 * Rule order mirrors the spec: hard denials first, then approval triggers.
 */

export type EvaluationInput = {
  /** Active policy document, or null = version 0 (default deny-all). */
  policy: PolicyCreate | null;
  amount: Money;
  category: string;
  /** Normalized counterparty key (merchant label). */
  counterparty: string;
  /** Has this agent paid this counterparty before? */
  isNewCounterparty: boolean;
  /** Sum of this agent's completed+processing+held spend today. */
  spentToday: Money;
  /** Same, this calendar month. */
  spentMonth: Money;
  /** Count of this agent's payments today. */
  transactionsToday: number;
};

export type EvaluationResult =
  | { decision: "allow" }
  | { decision: "hold"; trigger: string; detail: string }
  | { decision: "deny"; rule: string; detail: string };

export function evaluatePolicy(input: EvaluationInput): EvaluationResult {
  const { policy, amount } = input;

  if (!isValidAmount(amount.amount)) {
    return {
      decision: "deny",
      rule: "validation_error",
      detail: "Amount must be a decimal string.",
    };
  }
  if (gt({ amount: "0.00", currency: amount.currency }, amount)) {
    return {
      decision: "deny",
      rule: "validation_error",
      detail: "Amount must be positive.",
    };
  }

  // Version 0 — default deny-all until the owner attaches a policy.
  if (!policy) {
    return {
      decision: "deny",
      rule: "default_deny_all",
      detail:
        "This agent has no policy yet (version 0 denies everything). Set limits on the Policy screen first.",
    };
  }

  // ── Hard denials ─────────────────────────────────────────────────
  if (
    policy.currency_allowlist &&
    !policy.currency_allowlist.includes(amount.currency)
  ) {
    return {
      decision: "deny",
      rule: "currency_allowlist",
      detail: `${amount.currency} is not a permitted currency for this agent.`,
    };
  }

  // ── Approval triggers (held, never errors) — first match wins ────
  const limits = policy.limits ?? {};
  const approvalRules = policy.approvals ?? {};

  if (limits.per_transaction && gt(amount, limits.per_transaction)) {
    return {
      decision: "hold",
      trigger: "per_transaction_limit",
      detail: `Amount exceeds the per-transaction limit of ${limits.per_transaction.amount} ${limits.per_transaction.currency}.`,
    };
  }

  if (limits.daily && gt(add(input.spentToday, amount), limits.daily)) {
    return {
      decision: "hold",
      trigger: "daily_limit",
      detail: `This payment would exceed the daily limit of ${limits.daily.amount} ${limits.daily.currency}.`,
    };
  }

  if (limits.monthly && gt(add(input.spentMonth, amount), limits.monthly)) {
    return {
      decision: "hold",
      trigger: "monthly_limit",
      detail: `This payment would exceed the monthly limit of ${limits.monthly.amount} ${limits.monthly.currency}.`,
    };
  }

  if (
    limits.max_transactions_per_day != null &&
    input.transactionsToday + 1 > limits.max_transactions_per_day
  ) {
    return {
      decision: "hold",
      trigger: "velocity_limit",
      detail: `This agent already made ${input.transactionsToday} payments today (limit ${limits.max_transactions_per_day}).`,
    };
  }

  if (
    policy.merchant_category_allowlist &&
    !policy.merchant_category_allowlist.includes(input.category)
  ) {
    return {
      decision: "hold",
      trigger: "merchant_category",
      detail: `Category "${input.category}" is outside this agent's allowlist.`,
    };
  }

  if (
    approvalRules.require_approval_above &&
    gt(amount, approvalRules.require_approval_above)
  ) {
    return {
      decision: "hold",
      trigger: "require_approval_above",
      detail: `Amount is above the approval threshold of ${approvalRules.require_approval_above.amount} ${approvalRules.require_approval_above.currency}.`,
    };
  }

  if (
    (approvalRules.require_approval_for_new_counterparties ?? true) &&
    input.isNewCounterparty
  ) {
    return {
      decision: "hold",
      trigger: "new_counterparty",
      detail: `First payment to "${input.counterparty}" needs your approval.`,
    };
  }

  return { decision: "allow" };
}
