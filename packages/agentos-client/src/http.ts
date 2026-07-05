import createClient from "openapi-fetch";
import type { components, paths } from "./generated/schema";
import type { AgentOsService, SpendIntent, SpendResult } from "./service";
import type {
  ActivityEvent,
  ApiError,
  Approval,
  Payment,
  Policy,
  PolicyCreate,
} from "./types";

/**
 * The real backend: Agent OS /v1 over HTTPS, typed by the generated schema
 * (pnpm codegen ← docs/agent_os_openapi.yaml). Selected with
 * ENOS_BACKEND=agentos. Owner-key scoped; every mutating request carries an
 * Idempotency-Key per the spec.
 *
 * Phase B note: ENOS One's card-on-file "spend intent" maps onto /v1
 * counterparty + payment objects. The counterparty destination used here is
 * provisional until the Phase B mapping lands (open gate in the tool
 * catalog); the Payment/Approval/Policy flows are 1:1.
 */

export type AgentOsHttpConfig = {
  baseUrl: string;
  /** Owner key (ok_test_… / ok_live_…). */
  ownerKey: string;
};

function idempotencyKey(): string {
  return crypto.randomUUID();
}

class AgentOsHttpError extends Error {
  constructor(public error: Partial<ApiError> & { status: number }) {
    super(error.message ?? `Agent OS error (${error.status})`);
  }
}

export function createAgentOsHttp(config: AgentOsHttpConfig): AgentOsService {
  const client = createClient<paths>({
    baseUrl: config.baseUrl,
    headers: { Authorization: `Bearer ${config.ownerKey}` },
  });

  function fail(status: number, error: unknown): never {
    throw new AgentOsHttpError({
      status,
      ...(error as Partial<ApiError>),
    });
  }

  async function findOrCreateCounterparty(label: string): Promise<string> {
    const listed = await client.GET("/counterparties", {
      params: { query: { limit: 100 } },
    });
    if (listed.error) fail(listed.response.status, listed.error);
    const existing = listed.data.data.find((c) => c.display_name === label);
    if (existing) return existing.id;

    const created = await client.POST("/counterparties", {
      params: { header: { "Idempotency-Key": idempotencyKey() } },
      body: {
        display_name: label,
        // Provisional Phase B mapping for service merchants.
        destination: {
          type: "ewallet",
          ewallet_provider: "merchant",
          ewallet_id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        },
      },
    });
    if (created.error) fail(created.response.status, created.error);
    return created.data.id;
  }

  return {
    async getPolicy(agentId): Promise<Policy | null> {
      const res = await client.GET("/agents/{agent_id}/policy", {
        params: { path: { agent_id: agentId } },
      });
      if (res.error) fail(res.response.status, res.error);
      const policy = res.data as Policy;
      // Version 0 is the implicit deny-all default — the UI treats it as
      // "no policy yet", same as the mock.
      return policy.version === 0 ? null : policy;
    },

    async replacePolicy(agentId, doc: PolicyCreate): Promise<Policy> {
      const res = await client.PUT("/agents/{agent_id}/policy", {
        params: {
          path: { agent_id: agentId },
          header: { "Idempotency-Key": idempotencyKey() },
        },
        // Fields with spec defaults are optional on the wire; the generated
        // type marks them required, so cast at this boundary.
        body: doc as components["schemas"]["PolicyCreate"],
      });
      if (res.error) fail(res.response.status, res.error);
      return res.data as Policy;
    },

    async createPayment(intent: SpendIntent): Promise<SpendResult> {
      const counterpartyId = await findOrCreateCounterparty(
        intent.counterparty,
      );
      const res = await client.POST("/payments", {
        params: { header: { "Idempotency-Key": idempotencyKey() } },
        body: {
          agent_id: intent.agent_id,
          counterparty_id: counterpartyId,
          amount: intent.amount,
          purpose: intent.purpose,
        },
      });

      if (res.error) {
        const status = res.response.status;
        const err = res.error as Partial<ApiError>;
        if (status === 403 && err.code === "policy_denied") {
          return {
            outcome: "policy_denied",
            code: "policy_denied",
            message: err.message ?? "Denied by policy.",
            rule: (err.details?.rule as string) ?? "policy_denied",
          };
        }
        fail(status, res.error);
      }

      const payment = res.data as Payment;
      if (payment.status === "pending_approval" && payment.approval_id) {
        const approvalRes = await client.GET("/approvals/{approval_id}", {
          params: { path: { approval_id: payment.approval_id } },
        });
        if (approvalRes.error) {
          fail(approvalRes.response.status, approvalRes.error);
        }
        return {
          outcome: "pending_approval",
          payment,
          approval: approvalRes.data as Approval,
        };
      }
      return {
        outcome: payment.status === "completed" ? "completed" : "processing",
        payment,
      };
    },

    async listPayments(filter): Promise<Payment[]> {
      const res = await client.GET("/payments", {
        params: {
          query: {
            agent_id: filter?.agentId,
            limit: Math.min(filter?.limit ?? 50, 100),
          },
        },
      });
      if (res.error) fail(res.response.status, res.error);
      return res.data.data as Payment[];
    },

    async listApprovals(filter): Promise<Approval[]> {
      const res = await client.GET("/approvals", {
        params: {
          query: { status: filter?.status, agent_id: filter?.agentId },
        },
      });
      if (res.error) fail(res.response.status, res.error);
      return res.data.data as Approval[];
    },

    async approve(approvalId, note): Promise<Approval> {
      const res = await client.POST("/approvals/{approval_id}/approve", {
        params: {
          path: { approval_id: approvalId },
          header: { "Idempotency-Key": idempotencyKey() },
        },
        body: note ? { note } : undefined,
      });
      if (res.error) fail(res.response.status, res.error);
      return res.data as Approval;
    },

    async reject(approvalId, note): Promise<Approval> {
      const res = await client.POST("/approvals/{approval_id}/reject", {
        params: {
          path: { approval_id: approvalId },
          header: { "Idempotency-Key": idempotencyKey() },
        },
        body: note ? { note } : undefined,
      });
      if (res.error) fail(res.response.status, res.error);
      return res.data as Approval;
    },

    async listActivity(filter): Promise<ActivityEvent[]> {
      const res = await client.GET("/activity", {
        params: {
          query: {
            agent_id: filter?.agentId,
            limit: Math.min(filter?.limit ?? 100, 100),
          },
        },
      });
      if (res.error) fail(res.response.status, res.error);
      return res.data.data as ActivityEvent[];
    },
  };
}
