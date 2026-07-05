"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { newId } from "@/lib/ids";
import { db } from "@/server/db";
import { agents } from "@/server/db/schema";
import { getProvider } from "@/server/providers/registry";
import { requireSession } from "@/server/session";

const agentInput = z.object({
  displayName: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  avatar: z.string().min(1).max(8),
  provider: z.string().min(1),
  model: z.string().min(1).max(120),
  systemPrompt: z.string().max(20_000),
});

export async function createAgent(formData: FormData) {
  const session = await requireSession();
  const input = agentInput.parse(Object.fromEntries(formData));
  getProvider(input.provider); // reject unknown providers

  const id = newId("agt");
  await db.insert(agents).values({
    id,
    userId: session.user.id,
    displayName: input.displayName,
    description: input.description || null,
    avatar: input.avatar,
    provider: input.provider,
    model: input.model,
    systemPrompt: input.systemPrompt,
  });

  revalidatePath("/agents");
  redirect(`/agents/${id}`);
}

export async function updateAgent(agentId: string, formData: FormData) {
  const session = await requireSession();
  const input = agentInput.partial().parse(
    Object.fromEntries(
      [...formData.entries()].filter(([k]) => !k.startsWith("$")),
    ),
  );
  if (input.provider) getProvider(input.provider);

  await db
    .update(agents)
    .set({
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.description !== undefined && {
        description: input.description || null,
      }),
      ...(input.avatar !== undefined && { avatar: input.avatar }),
      ...(input.provider !== undefined && { provider: input.provider }),
      ...(input.model !== undefined && { model: input.model }),
      ...(input.systemPrompt !== undefined && {
        systemPrompt: input.systemPrompt,
      }),
    })
    .where(and(eq(agents.id, agentId), eq(agents.userId, session.user.id)));

  revalidatePath(`/agents/${agentId}`);
  revalidatePath("/agents");
}

/** Mirrors /v1 suspend/reactivate semantics — agents are never deleted. */
export async function setAgentStatus(
  agentId: string,
  status: "active" | "suspended",
) {
  const session = await requireSession();
  await db
    .update(agents)
    .set({ status })
    .where(and(eq(agents.id, agentId), eq(agents.userId, session.user.id)));
  revalidatePath(`/agents/${agentId}`);
  revalidatePath("/agents");
}

export async function listAgents() {
  const session = await requireSession();
  return db
    .select()
    .from(agents)
    .where(eq(agents.userId, session.user.id))
    .orderBy(desc(agents.createdAt));
}

export async function getAgent(agentId: string) {
  const session = await requireSession();
  const rows = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.userId, session.user.id)))
    .limit(1);
  return rows[0] ?? null;
}
