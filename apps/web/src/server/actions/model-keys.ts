"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { newId } from "@/lib/ids";
import { getKeyring } from "@/server/crypto/keyring";
import { db } from "@/server/db";
import { modelKeys } from "@/server/db/schema";
import { getProvider } from "@/server/providers/registry";
import { requireSession } from "@/server/session";

const keyInput = z.object({
  provider: z.string().min(1),
  secret: z.string().min(8).max(4096),
  label: z.string().max(120).optional(),
  baseUrl: z.union([z.literal(""), z.string().url()]).optional(),
});

/**
 * Saves (or replaces) the caller's key for a provider. The secret is
 * envelope-encrypted at rest and NEVER returned to the browser after save —
 * reads expose `last4` only.
 */
export async function saveModelKey(formData: FormData) {
  const session = await requireSession();
  const input = keyInput.parse(Object.fromEntries(formData));
  getProvider(input.provider); // reject unknown providers

  const envelope = getKeyring().seal(input.secret);
  const last4 = input.secret.slice(-4);

  await db
    .delete(modelKeys)
    .where(
      and(
        eq(modelKeys.userId, session.user.id),
        eq(modelKeys.provider, input.provider),
      ),
    );
  await db.insert(modelKeys).values({
    id: newId("mk"),
    userId: session.user.id,
    provider: input.provider,
    label: input.label || null,
    last4,
    baseUrl: input.baseUrl || null,
    secretEnvelope: envelope,
  });

  revalidatePath("/settings");
}

export async function deleteModelKey(provider: string) {
  const session = await requireSession();
  await db
    .delete(modelKeys)
    .where(
      and(
        eq(modelKeys.userId, session.user.id),
        eq(modelKeys.provider, provider),
      ),
    );
  revalidatePath("/settings");
}

/** Browser-safe listing: provider, label, last4 — never the secret. */
export async function listModelKeysSafe() {
  const session = await requireSession();
  const rows = await db
    .select({
      provider: modelKeys.provider,
      label: modelKeys.label,
      last4: modelKeys.last4,
      baseUrl: modelKeys.baseUrl,
      createdAt: modelKeys.createdAt,
    })
    .from(modelKeys)
    .where(eq(modelKeys.userId, session.user.id));
  return rows;
}
