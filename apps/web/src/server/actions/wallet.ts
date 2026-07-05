"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { newId } from "@/lib/ids";
import { db } from "@/server/db";
import { paymentMethods, stripeCustomers } from "@/server/db/schema";
import { getStripe, isSimulatedMode } from "@/server/spend/processor";
import { requireSession } from "@/server/session";

async function ensureCustomer(userId: string, email: string): Promise<string> {
  const [existing] = await db
    .select()
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, userId))
    .limit(1);
  if (existing) return existing.customerId;

  const stripe = getStripe();
  if (!stripe) throw new Error("processor_not_configured");
  const customer = await stripe.customers.create({ email });
  await db
    .insert(stripeCustomers)
    .values({ userId, customerId: customer.id });
  return customer.id;
}

/** Starts card vaulting: the browser confirms this with the Payment Element. */
export async function createSetupIntent(): Promise<{ clientSecret: string }> {
  const session = await requireSession();
  const stripe = getStripe();
  if (!stripe) throw new Error("processor_not_configured");

  const customerId = await ensureCustomer(session.user.id, session.user.email);
  const intent = await stripe.setupIntents.create({
    customer: customerId,
    usage: "off_session",
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
  });
  if (!intent.client_secret) throw new Error("processor_error");
  return { clientSecret: intent.client_secret };
}

/**
 * After the browser confirms the SetupIntent, persist the vault reference.
 * We store the processor token + display metadata ONLY — never card data.
 */
export async function attachPaymentMethod(setupIntentId: string) {
  const session = await requireSession();
  const stripe = getStripe();
  if (!stripe) throw new Error("processor_not_configured");

  const intent = await stripe.setupIntents.retrieve(setupIntentId, {
    expand: ["payment_method"],
  });
  if (intent.status !== "succeeded") throw new Error("setup_not_succeeded");
  const pm = intent.payment_method;
  if (!pm || typeof pm === "string" || !pm.card) {
    throw new Error("unexpected_payment_method");
  }

  const [customer] = await db
    .select()
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, session.user.id))
    .limit(1);
  if (!customer || intent.customer !== customer.customerId) {
    throw new Error("customer_mismatch");
  }

  const hasDefault = await db
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.userId, session.user.id),
        eq(paymentMethods.isDefault, true),
      ),
    )
    .limit(1);

  await db.insert(paymentMethods).values({
    id: newId("pm"),
    userId: session.user.id,
    processorToken: pm.id,
    brand: pm.card.brand,
    last4: pm.card.last4,
    expMonth: pm.card.exp_month,
    expYear: pm.card.exp_year,
    isDefault: hasDefault.length === 0,
  });

  revalidatePath("/wallet");
}

/** Simulated card for local dev when no processor keys are configured. */
export async function addSimulatedCard() {
  const session = await requireSession();
  if (!isSimulatedMode()) throw new Error("only_available_without_processor");

  const hasDefault = await db
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.userId, session.user.id),
        eq(paymentMethods.isDefault, true),
      ),
    )
    .limit(1);

  await db.insert(paymentMethods).values({
    id: newId("pm"),
    userId: session.user.id,
    processorToken: `pm_sim_${newId("x").slice(2)}`,
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: new Date().getFullYear() + 3,
    isDefault: hasDefault.length === 0,
  });

  revalidatePath("/wallet");
}

export async function setDefaultPaymentMethod(id: string) {
  const session = await requireSession();
  await db
    .update(paymentMethods)
    .set({ isDefault: false })
    .where(eq(paymentMethods.userId, session.user.id));
  await db
    .update(paymentMethods)
    .set({ isDefault: true })
    .where(
      and(
        eq(paymentMethods.id, id),
        eq(paymentMethods.userId, session.user.id),
      ),
    );
  revalidatePath("/wallet");
}

export async function removePaymentMethod(id: string) {
  const session = await requireSession();
  const [method] = await db
    .select()
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.id, id),
        eq(paymentMethods.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!method) return;

  const stripe = getStripe();
  if (stripe && !method.processorToken.startsWith("pm_sim_")) {
    try {
      await stripe.paymentMethods.detach(method.processorToken);
    } catch {
      // Detach failure shouldn't strand the local record.
    }
  }
  await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  revalidatePath("/wallet");
}

export async function listPaymentMethods() {
  const session = await requireSession();
  return db
    .select({
      id: paymentMethods.id,
      brand: paymentMethods.brand,
      last4: paymentMethods.last4,
      expMonth: paymentMethods.expMonth,
      expYear: paymentMethods.expYear,
      isDefault: paymentMethods.isDefault,
    })
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, session.user.id));
}
