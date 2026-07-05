"use server";

import type { Policy, PolicyCreate } from "@enos/agentos-client";
import { revalidatePath } from "next/cache";
import { getAgentOs } from "@/server/agentos";
import { requireSession } from "@/server/session";

/**
 * PUT semantics from the /v1 spec: the policy is replaced whole, never
 * patched — every save creates a new immutable version.
 */
export async function savePolicy(
  agentId: string,
  doc: PolicyCreate,
): Promise<Policy> {
  const session = await requireSession();
  const policy = await getAgentOs(session.user.id).replacePolicy(agentId, doc);
  revalidatePath(`/agents/${agentId}/policy`);
  revalidatePath(`/agents/${agentId}`);
  return policy;
}
