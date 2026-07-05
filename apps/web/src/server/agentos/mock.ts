import type {
  ActivityEvent,
  AgentOsService,
  Approval,
  Money,
  Payment,
  PaymentTimelineEntry,
  Policy,
  PolicyCreate,
  SpendIntent,
  SpendResult,
} from "@enos/agentos-client";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { newId } from "@/lib/ids";
import { add, zero } from "@/lib/money";
import { db } from "@/server/db";
import {
  activityEvents,
  agents,
  approvals,
  payments,
  policies,
} from "@/server/db/schema";
import { chargeDefaultMethod } from "@/server/spend/processor";
import { evaluatePolicy } from "./policy-engine";

/**
 * Phase A mock of the Agent OS money surface. Faithful to the /v1 semantics:
 * approvals are 202s (held objects), policies are versioned + immutable,
 * activity is append-only, attribution is structural. Swapped out whole for
 * the real sandbox by ENOS_BACKEND=agentos.
 */

const moneySchema = z.object({
  amount: z.string().regex(/^-?\d+(\.\d+)?$/),
  currency: z.string().length(3),
});

const policyCreateSchema = z.object({
  limits: z.object({
    per_transaction: moneySchema.optional(),
    daily: moneySchema.optional(),
    monthly: moneySchema.optional(),
    max_transactions_per_day: z.number().int().positive().nullable().optional(),
  }),
  counterparty_allowlist: z.array(z.string()).nullable().optional(),
  verified_counterparties_only: z.boolean().optional(),
  merchant_category_allowlist: z.array(z.string()).nullable().optional(),
  currency_allowlist: z.array(z.string()).nullable().optional(),
  approvals: z.object({
    require_approval_above: moneySchema.optional(),
    require_approval_for_new_counterparties: z.boolean().optional(),
    require_approval_for_cross_border: z.boolean().optional(),
    auto_expire_hours: z.number().int().positive().optional(),
  }),
});

type PaymentRow = typeof payments.$inferSelect;
type ApprovalRow = typeof approvals.$inferSelect;

function agentCredential(agentId: string): string {
  return `crd_ws_${agentId.replace(/^agt_/, "")}`;
}
function ownerCredential(userId: string): string {
  return `crd_owner_${userId}`;
}

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    agent_id: row.agentId,
    credential_id: row.credentialId,
    counterparty_id: row.counterpartyLabel,
    source_amount: { amount: row.amount, currency: row.currency },
    status: row.status,
    approval_id: row.approvalId,
    failure_reason: row.failureReason,
    rail: "card_on_file",
    purpose: row.purpose,
    timeline: JSON.parse(row.timeline as string) as PaymentTimelineEntry[],
    created_at: row.createdAt.toISOString(),
    completed_at: row.completedAt?.toISOString() ?? null,
  };
}

function toApproval(row: ApprovalRow): Approval {
  return {
    id: row.id,
    agent_id: row.agentId,
    action_type: row.actionType,
    action_id: row.actionId,
    trigger: row.trigger,
    summary: JSON.parse(row.summary as string) as Record<string, unknown>,
    status: row.status,
    decided_by: row.decidedBy,
    decided_at: row.decidedAt?.toISOString() ?? null,
    note: row.note,
    expires_at: row.expiresAt.toISOString(),
    created_at: row.createdAt.toISOString(),
  };
}

export class MockAgentOs implements AgentOsService {
  constructor(private userId: string) {}

  private async emit(event: {
    type: string;
    agentId?: string | null;
    credentialId?: string | null;
    resourceType?: string;
    resourceId?: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    await db.insert(activityEvents).values({
      id: newId("evt"),
      userId: this.userId,
      type: event.type,
      agentId: event.agentId ?? null,
      credentialId: event.credentialId ?? null,
      resourceType: event.resourceType ?? null,
      resourceId: event.resourceId ?? null,
      data: event.data ? JSON.stringify(event.data) : null,
    });
  }

  private async ownedAgent(agentId: string) {
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.userId, this.userId)))
      .limit(1);
    if (!agent) throw new Error("not_found: agent");
    return agent;
  }

  // ── Policy ─────────────────────────────────────────────────────────

  async getPolicy(agentId: string): Promise<Policy | null> {
    await this.ownedAgent(agentId);
    const [row] = await db
      .select()
      .from(policies)
      .where(eq(policies.agentId, agentId))
      .orderBy(desc(policies.version))
      .limit(1);
    if (!row) return null;
    const doc = JSON.parse(row.doc as string) as PolicyCreate;
    return {
      ...doc,
      agent_id: agentId,
      version: row.version,
      created_at: row.createdAt.toISOString(),
    };
  }

  async replacePolicy(agentId: string, input: PolicyCreate): Promise<Policy> {
    const agent = await this.ownedAgent(agentId);
    const doc = policyCreateSchema.parse(input) as PolicyCreate;

    const [latest] = await db
      .select({ version: policies.version })
      .from(policies)
      .where(eq(policies.agentId, agentId))
      .orderBy(desc(policies.version))
      .limit(1);
    const version = (latest?.version ?? 0) + 1;

    const [row] = await db
      .insert(policies)
      .values({
        id: newId("pol"),
        agentId,
        userId: this.userId,
        version,
        doc: JSON.stringify(doc),
      })
      .returning();
    await db
      .update(agents)
      .set({ policyVersion: version })
      .where(eq(agents.id, agentId));

    await this.emit({
      type: "policy.updated",
      agentId,
      credentialId: ownerCredential(this.userId),
      resourceType: "policy",
      resourceId: row.id,
      data: { version, agent_name: agent.displayName },
    });

    return {
      ...doc,
      agent_id: agentId,
      version,
      created_at: row.createdAt.toISOString(),
    };
  }

  // ── Payments ───────────────────────────────────────────────────────

  private async spendAggregates(agentId: string, currency: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const counted: PaymentRow["status"][] = [
      "completed",
      "processing",
      "pending_approval",
    ];
    const rows = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.agentId, agentId),
          eq(payments.currency, currency),
          inArray(payments.status, counted),
          gte(payments.createdAt, startOfMonth),
        ),
      );

    let spentToday: Money = zero(currency);
    let spentMonth: Money = zero(currency);
    let transactionsToday = 0;
    for (const row of rows) {
      const m: Money = { amount: row.amount, currency: row.currency };
      spentMonth = add(spentMonth, m);
      if (row.createdAt >= startOfDay) {
        spentToday = add(spentToday, m);
        transactionsToday += 1;
      }
    }
    return { spentToday, spentMonth, transactionsToday };
  }

  async createPayment(intent: SpendIntent): Promise<SpendResult> {
    const agent = await this.ownedAgent(intent.agent_id);
    const credentialId = agentCredential(agent.id);

    if (agent.status !== "active") {
      return {
        outcome: "policy_denied",
        code: "policy_denied",
        message: "This agent is suspended — reactivate it before it can spend.",
        rule: "agent_suspended",
      };
    }

    const policy = await this.getPolicy(agent.id);
    const { spentToday, spentMonth, transactionsToday } =
      await this.spendAggregates(agent.id, intent.amount.currency);

    const priorToCounterparty = await db
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(
          eq(payments.agentId, agent.id),
          eq(payments.counterpartyLabel, intent.counterparty),
          inArray(payments.status, ["completed", "processing"]),
        ),
      )
      .limit(1);

    const evaluation = evaluatePolicy({
      policy,
      amount: intent.amount,
      category: intent.category,
      counterparty: intent.counterparty,
      isNewCounterparty: priorToCounterparty.length === 0,
      spentToday,
      spentMonth,
      transactionsToday,
    });

    await this.emit({
      type: "policy.evaluation",
      agentId: agent.id,
      credentialId,
      resourceType: "spend_intent",
      resourceId: intent.counterparty,
      data: {
        decision: evaluation.decision,
        rule:
          evaluation.decision === "hold"
            ? evaluation.trigger
            : evaluation.decision === "deny"
              ? evaluation.rule
              : "within_policy",
        amount: intent.amount,
        counterparty: intent.counterparty,
        category: intent.category,
        policy_version: policy?.version ?? 0,
      },
    });

    if (evaluation.decision === "deny") {
      return {
        outcome: "policy_denied",
        code: "policy_denied",
        message: evaluation.detail,
        rule: evaluation.rule,
      };
    }

    const paymentId = newId("pay");
    const nowIso = new Date().toISOString();

    if (evaluation.decision === "hold") {
      const approvalId = newId("apr");
      const expireHours = policy?.approvals?.auto_expire_hours ?? 72;
      const timeline: PaymentTimelineEntry[] = [
        { status: "created", at: nowIso },
        { status: "pending_approval", at: nowIso, detail: evaluation.trigger },
      ];
      const [paymentRow] = await db
        .insert(payments)
        .values({
          id: paymentId,
          userId: this.userId,
          agentId: agent.id,
          credentialId,
          counterpartyLabel: intent.counterparty,
          category: intent.category,
          amount: intent.amount.amount,
          currency: intent.amount.currency,
          status: "pending_approval",
          approvalId,
          purpose: intent.purpose ?? null,
          timeline: JSON.stringify(timeline),
        })
        .returning();
      const [approvalRow] = await db
        .insert(approvals)
        .values({
          id: approvalId,
          userId: this.userId,
          agentId: agent.id,
          actionType: "payment",
          actionId: paymentId,
          trigger: evaluation.trigger,
          summary: JSON.stringify({
            agent_name: agent.displayName,
            agent_avatar: agent.avatar,
            amount: intent.amount,
            counterparty: intent.counterparty,
            category: intent.category,
            purpose: intent.purpose ?? null,
            detail: evaluation.detail,
          }),
          status: "pending",
          expiresAt: new Date(Date.now() + expireHours * 3_600_000),
        })
        .returning();

      await this.emit({
        type: "approval.requested",
        agentId: agent.id,
        credentialId,
        resourceType: "approval",
        resourceId: approvalId,
        data: {
          trigger: evaluation.trigger,
          amount: intent.amount,
          counterparty: intent.counterparty,
        },
      });

      return {
        outcome: "pending_approval",
        payment: toPayment(paymentRow),
        approval: toApproval(approvalRow),
      };
    }

    // Within policy — execute on the vaulted method.
    return this.executePayment({
      paymentId,
      agentId: agent.id,
      credentialId,
      intent,
      initialTimeline: [{ status: "created", at: nowIso }],
    });
  }

  private async executePayment(opts: {
    paymentId: string;
    agentId: string;
    credentialId: string;
    intent: SpendIntent;
    initialTimeline: PaymentTimelineEntry[];
    approvalId?: string;
  }): Promise<SpendResult> {
    const { intent } = opts;
    const timeline = [
      ...opts.initialTimeline,
      { status: "processing", at: new Date().toISOString() },
    ];

    const charge = await chargeDefaultMethod(this.userId, intent.amount);

    if (!charge.ok) {
      timeline.push({
        status: "failed",
        at: new Date().toISOString(),
        detail: charge.reason,
      });
      const [row] = await db
        .insert(payments)
        .values({
          id: opts.paymentId,
          userId: this.userId,
          agentId: opts.agentId,
          credentialId: opts.credentialId,
          counterpartyLabel: intent.counterparty,
          category: intent.category,
          amount: intent.amount.amount,
          currency: intent.amount.currency,
          status: "failed",
          approvalId: opts.approvalId ?? null,
          failureReason: charge.reason,
          purpose: intent.purpose ?? null,
          timeline: JSON.stringify(timeline),
        })
        .returning();
      await this.emit({
        type: "payment.failed",
        agentId: opts.agentId,
        credentialId: opts.credentialId,
        resourceType: "payment",
        resourceId: opts.paymentId,
        data: {
          amount: intent.amount,
          counterparty: intent.counterparty,
          failure_reason: charge.reason,
        },
      });
      return { outcome: "failed", payment: toPayment(row) };
    }

    timeline.push({ status: "completed", at: new Date().toISOString() });
    const [row] = await db
      .insert(payments)
      .values({
        id: opts.paymentId,
        userId: this.userId,
        agentId: opts.agentId,
        credentialId: opts.credentialId,
        counterpartyLabel: intent.counterparty,
        category: intent.category,
        amount: intent.amount.amount,
        currency: intent.amount.currency,
        status: "completed",
        approvalId: opts.approvalId ?? null,
        purpose: intent.purpose ?? null,
        processorRef: charge.ref,
        timeline: JSON.stringify(timeline),
        completedAt: new Date(),
      })
      .returning();
    await this.emit({
      type: "payment.completed",
      agentId: opts.agentId,
      credentialId: opts.credentialId,
      resourceType: "payment",
      resourceId: opts.paymentId,
      data: { amount: intent.amount, counterparty: intent.counterparty },
    });
    return { outcome: "completed", payment: toPayment(row) };
  }

  async listPayments(filter?: {
    agentId?: string;
    limit?: number;
  }): Promise<Payment[]> {
    const rows = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.userId, this.userId),
          filter?.agentId ? eq(payments.agentId, filter.agentId) : undefined,
        ),
      )
      .orderBy(desc(payments.createdAt))
      .limit(filter?.limit ?? 50);
    return rows.map(toPayment);
  }

  // ── Approvals ──────────────────────────────────────────────────────

  /** Lazily expires overdue approvals (→ payment cancelled), per spec. */
  private async expireOverdue(): Promise<void> {
    const overdue = await db
      .select()
      .from(approvals)
      .where(
        and(eq(approvals.userId, this.userId), eq(approvals.status, "pending")),
      );
    const now = new Date();
    for (const row of overdue) {
      if (row.expiresAt > now) continue;
      await db
        .update(approvals)
        .set({ status: "expired", decidedAt: now })
        .where(eq(approvals.id, row.id));
      await this.cancelHeldPayment(row, "approval_expired");
      await this.emit({
        type: "approval.decided",
        agentId: row.agentId,
        credentialId: ownerCredential(this.userId),
        resourceType: "approval",
        resourceId: row.id,
        data: { status: "expired" },
      });
    }
  }

  private async cancelHeldPayment(
    approval: ApprovalRow,
    reason: string,
  ): Promise<void> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, approval.actionId))
      .limit(1);
    if (!payment || payment.status !== "pending_approval") return;
    const timeline = [
      ...(JSON.parse(payment.timeline as string) as PaymentTimelineEntry[]),
      { status: "cancelled", at: new Date().toISOString(), detail: reason },
    ];
    await db
      .update(payments)
      .set({
        status: "cancelled",
        failureReason: reason,
        timeline: JSON.stringify(timeline),
      })
      .where(eq(payments.id, payment.id));
    await this.emit({
      type: "payment.cancelled",
      agentId: payment.agentId,
      credentialId: ownerCredential(this.userId),
      resourceType: "payment",
      resourceId: payment.id,
      data: { reason },
    });
  }

  async listApprovals(filter?: {
    status?: Approval["status"];
    agentId?: string;
  }): Promise<Approval[]> {
    await this.expireOverdue();
    const rows = await db
      .select()
      .from(approvals)
      .where(
        and(
          eq(approvals.userId, this.userId),
          filter?.status ? eq(approvals.status, filter.status) : undefined,
          filter?.agentId ? eq(approvals.agentId, filter.agentId) : undefined,
        ),
      )
      .orderBy(desc(approvals.createdAt));
    return rows.map(toApproval);
  }

  private async pendingApproval(approvalId: string): Promise<ApprovalRow> {
    await this.expireOverdue();
    const [row] = await db
      .select()
      .from(approvals)
      .where(
        and(eq(approvals.id, approvalId), eq(approvals.userId, this.userId)),
      )
      .limit(1);
    if (!row) throw new Error("not_found: approval");
    if (row.status !== "pending") {
      throw new Error(`conflict: approval is ${row.status}`);
    }
    return row;
  }

  async approve(approvalId: string, note?: string): Promise<Approval> {
    const approval = await this.pendingApproval(approvalId);
    const decidedBy = ownerCredential(this.userId);
    const now = new Date();

    // Release the held payment for execution.
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, approval.actionId))
      .limit(1);
    if (payment && payment.status === "pending_approval") {
      const priorTimeline = JSON.parse(
        payment.timeline as string,
      ) as PaymentTimelineEntry[];
      const charge = await chargeDefaultMethod(this.userId, {
        amount: payment.amount,
        currency: payment.currency,
      });
      const timeline = [
        ...priorTimeline,
        { status: "processing", at: new Date().toISOString(), detail: "approved by owner" },
      ];
      if (charge.ok) {
        timeline.push({ status: "completed", at: new Date().toISOString() });
        await db
          .update(payments)
          .set({
            status: "completed",
            processorRef: charge.ref,
            timeline: JSON.stringify(timeline),
            completedAt: now,
          })
          .where(eq(payments.id, payment.id));
        await this.emit({
          type: "payment.completed",
          agentId: payment.agentId,
          credentialId: payment.credentialId,
          resourceType: "payment",
          resourceId: payment.id,
          data: {
            amount: { amount: payment.amount, currency: payment.currency },
            counterparty: payment.counterpartyLabel,
            approved_by: decidedBy,
          },
        });
      } else {
        timeline.push({
          status: "failed",
          at: new Date().toISOString(),
          detail: charge.reason,
        });
        await db
          .update(payments)
          .set({
            status: "failed",
            failureReason: charge.reason,
            timeline: JSON.stringify(timeline),
          })
          .where(eq(payments.id, payment.id));
        await this.emit({
          type: "payment.failed",
          agentId: payment.agentId,
          credentialId: payment.credentialId,
          resourceType: "payment",
          resourceId: payment.id,
          data: { failure_reason: charge.reason },
        });
      }
    }

    const [updated] = await db
      .update(approvals)
      .set({ status: "approved", decidedBy, decidedAt: now, note: note ?? null })
      .where(eq(approvals.id, approvalId))
      .returning();
    await this.emit({
      type: "approval.decided",
      agentId: approval.agentId,
      credentialId: decidedBy,
      resourceType: "approval",
      resourceId: approvalId,
      data: { status: "approved", note: note ?? null },
    });
    return toApproval(updated);
  }

  async reject(approvalId: string, note?: string): Promise<Approval> {
    const approval = await this.pendingApproval(approvalId);
    const decidedBy = ownerCredential(this.userId);

    await this.cancelHeldPayment(approval, "owner_rejected");
    const [updated] = await db
      .update(approvals)
      .set({
        status: "rejected",
        decidedBy,
        decidedAt: new Date(),
        note: note ?? null,
      })
      .where(eq(approvals.id, approvalId))
      .returning();
    await this.emit({
      type: "approval.decided",
      agentId: approval.agentId,
      credentialId: decidedBy,
      resourceType: "approval",
      resourceId: approvalId,
      data: { status: "rejected", note: note ?? null },
    });
    return toApproval(updated);
  }

  // ── Activity ───────────────────────────────────────────────────────

  async listActivity(filter?: {
    agentId?: string;
    limit?: number;
  }): Promise<ActivityEvent[]> {
    const rows = await db
      .select()
      .from(activityEvents)
      .where(
        and(
          eq(activityEvents.userId, this.userId),
          filter?.agentId
            ? eq(activityEvents.agentId, filter.agentId)
            : undefined,
        ),
      )
      .orderBy(desc(activityEvents.occurredAt))
      .limit(filter?.limit ?? 100);
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      agent_id: row.agentId,
      credential_id: row.credentialId,
      resource:
        row.resourceType && row.resourceId
          ? { type: row.resourceType, id: row.resourceId }
          : undefined,
      data: row.data
        ? (JSON.parse(row.data as string) as Record<string, unknown>)
        : undefined,
      occurred_at: row.occurredAt.toISOString(),
    }));
  }
}
