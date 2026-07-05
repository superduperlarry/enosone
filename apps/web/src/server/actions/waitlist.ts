"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { newId } from "@/lib/ids";
import { db } from "@/server/db";
import { waitlist } from "@/server/db/schema";
import { requireSession } from "@/server/session";

const featureSchema = z.enum(["balance", "cards", "identity", "bank"]);

export async function joinWaitlist(feature: string) {
  const session = await requireSession();
  const parsed = featureSchema.parse(feature);

  const existing = await db
    .select({ id: waitlist.id })
    .from(waitlist)
    .where(
      and(
        eq(waitlist.userId, session.user.id),
        eq(waitlist.feature, parsed),
      ),
    )
    .limit(1);
  if (existing.length > 0) return { joined: true as const };

  await db.insert(waitlist).values({
    id: newId("wl"),
    userId: session.user.id,
    feature: parsed,
    email: session.user.email,
  });
  return { joined: true as const };
}

export async function isOnWaitlist(feature: string) {
  const session = await requireSession();
  const parsed = featureSchema.parse(feature);
  const rows = await db
    .select({ id: waitlist.id })
    .from(waitlist)
    .where(
      and(
        eq(waitlist.userId, session.user.id),
        eq(waitlist.feature, parsed),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
