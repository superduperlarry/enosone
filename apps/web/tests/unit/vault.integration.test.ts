import Stripe from "stripe";
import { describe, expect, it } from "vitest";

/**
 * Vault flow integration test against the Stripe TEST API. Auto-skips when
 * STRIPE_SECRET_KEY is absent (e.g. plain CI). Exercises exactly what the
 * app does: vault a card off-session via SetupIntent, then charge the token
 * off-session — raw card data never touches our code (test payment methods
 * like pm_card_visa stand in for the browser-side Payment Element).
 */
const key = process.env.STRIPE_SECRET_KEY;
const hasTestKey = !!key && key.startsWith("sk_test_");

describe.skipIf(!hasTestKey)("Stripe vault flow (test mode)", () => {
  it("vaults a card and charges it off-session", async () => {
    const stripe = new Stripe(key!);
    const customer = await stripe.customers.create({
      email: "vault-test@enosone.dev",
    });

    const setup = await stripe.setupIntents.create({
      customer: customer.id,
      usage: "off_session",
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    });
    const confirmed = await stripe.setupIntents.confirm(setup.id, {
      payment_method: "pm_card_visa",
    });
    expect(confirmed.status).toBe("succeeded");

    const pmId = confirmed.payment_method as string;
    const pm = await stripe.paymentMethods.retrieve(pmId);
    // We persist ONLY these fields — never PAN/CVC.
    expect(pm.card?.brand).toBe("visa");
    expect(pm.card?.last4).toBe("4242");

    const charge = await stripe.paymentIntents.create({
      amount: 1999,
      currency: "usd",
      customer: customer.id,
      payment_method: pmId,
      off_session: true,
      confirm: true,
    });
    expect(charge.status).toBe("succeeded");

    await stripe.customers.del(customer.id);
  }, 60_000);
});
