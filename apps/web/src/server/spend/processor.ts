import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import type { Money } from "@enos/agentos-client";
import { toMinorUnits } from "@/lib/money";
import { db } from "@/server/db";
import { paymentMethods, stripeCustomers } from "@/server/db/schema";

/**
 * PCI boundary: this module only ever handles processor tokens. Card entry
 * happens in the processor's client SDK (Payment Element); raw PAN/CVV never
 * reach our servers. Without STRIPE_SECRET_KEY the processor runs in
 * simulated mode so the full spend flow still works locally.
 */

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

export function isSimulatedMode(): boolean {
  return !process.env.STRIPE_SECRET_KEY;
}

export type ChargeResult =
  | { ok: true; ref: string }
  | { ok: false; reason: string };

export async function chargeDefaultMethod(
  userId: string,
  amount: Money,
): Promise<ChargeResult> {
  const [method] = await db
    .select()
    .from(paymentMethods)
    .where(
      and(eq(paymentMethods.userId, userId), eq(paymentMethods.isDefault, true)),
    )
    .limit(1);
  if (!method) {
    return { ok: false, reason: "no_payment_method" };
  }

  const stripe = getStripe();
  if (!stripe || method.processorToken.startsWith("pm_sim_")) {
    // Simulated processor: deterministic success.
    return { ok: true, ref: `sim_${Date.now().toString(36)}` };
  }

  const [customer] = await db
    .select()
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, userId))
    .limit(1);
  if (!customer) return { ok: false, reason: "no_processor_customer" };

  try {
    const intent = await stripe.paymentIntents.create({
      amount: toMinorUnits(amount),
      currency: amount.currency.toLowerCase(),
      customer: customer.customerId,
      payment_method: method.processorToken,
      off_session: true,
      confirm: true,
    });
    if (intent.status === "succeeded" || intent.status === "processing") {
      return { ok: true, ref: intent.id };
    }
    return { ok: false, reason: `processor_status_${intent.status}` };
  } catch (err) {
    const message =
      err instanceof Stripe.errors.StripeError
        ? (err.code ?? err.type)
        : "processor_error";
    return { ok: false, reason: message };
  }
}
