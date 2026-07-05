import type {
  ActivityEvent,
  Approval,
  Money,
  Payment,
  Policy,
  PolicyCreate,
} from "./types";

/**
 * The ONLY door ENOS One uses for money operations. Two implementations:
 *  - `mock`    — Phase A default; local store + a faithful mirror of the
 *                policy semantics, card execution via the processor vault.
 *  - `agentos` — the real /v1 sandbox (Milestone 6 / Phase B).
 * Selected by ENOS_BACKEND. UI code must never know which one it's talking to.
 */

export type SpendIntent = {
  agent_id: string;
  amount: Money;
  /** Merchant/service being paid — maps to counterparty. */
  counterparty: string;
  /** Category key (MCC-flavored) for allowlist evaluation. */
  category: string;
  purpose?: string;
};

/**
 * Mirrors the /v1 payment outcomes: 201 processing, 202 held, 403 denied.
 * The mock executes synchronously, so an allowed payment lands as
 * `completed` or `failed` immediately; the real backend returns `processing`.
 */
export type SpendResult =
  | { outcome: "processing" | "completed" | "failed"; payment: Payment }
  | { outcome: "pending_approval"; payment: Payment; approval: Approval }
  | { outcome: "policy_denied"; code: "policy_denied"; message: string; rule: string };

export interface AgentOsService {
  // Policy — replace-whole, versioned, immutable (PUT semantics).
  getPolicy(agentId: string): Promise<Policy | null>;
  replacePolicy(agentId: string, policy: PolicyCreate): Promise<Policy>;

  // Payments.
  createPayment(intent: SpendIntent): Promise<SpendResult>;
  listPayments(filter?: { agentId?: string; limit?: number }): Promise<Payment[]>;

  // Approvals — held objects, never errors.
  listApprovals(filter?: {
    status?: Approval["status"];
    agentId?: string;
  }): Promise<Approval[]>;
  approve(approvalId: string, note?: string): Promise<Approval>;
  reject(approvalId: string, note?: string): Promise<Approval>;

  // Activity — unified, append-only, attributed.
  listActivity(filter?: {
    agentId?: string;
    limit?: number;
  }): Promise<ActivityEvent[]>;
}
