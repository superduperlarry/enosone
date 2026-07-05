"use server";

import type { SpendResult } from "@enos/agentos-client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { money } from "@/lib/money";
import { SPEND_CATEGORIES } from "@/lib/spend-categories";
import { getAgentOs } from "@/server/agentos";
import { requireSession } from "@/server/session";

const spendInput = z.object({
  agentId: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a positive amount"),
  currency: z.literal("USD"),
  counterparty: z.string().min(1).max(120),
  category: z.enum(SPEND_CATEGORIES),
  purpose: z.string().max(280).optional(),
});

/**
 * Raise a spend intent for an agent. Flows through the AgentOsService seam;
 * outcomes mirror /v1: completed/processing (allowed), pending_approval
 * (held — never an error), or policy_denied.
 */
export async function raiseSpendIntent(
  _prev: SpendResult | null,
  formData: FormData,
): Promise<SpendResult> {
  const session = await requireSession();
  const input = spendInput.parse(Object.fromEntries(formData));

  const result = await getAgentOs(session.user.id).createPayment({
    agent_id: input.agentId,
    amount: money(input.amount, input.currency),
    counterparty: input.counterparty,
    category: input.category,
    purpose: input.purpose || undefined,
  });

  revalidatePath("/activity");
  revalidatePath("/approvals");
  return result;
}

export async function decideApproval(
  approvalId: string,
  decision: "approve" | "reject",
  note?: string,
) {
  const session = await requireSession();
  const service = getAgentOs(session.user.id);
  if (decision === "approve") {
    await service.approve(approvalId, note);
  } else {
    await service.reject(approvalId, note);
  }
  revalidatePath("/approvals");
  revalidatePath("/activity");
}
