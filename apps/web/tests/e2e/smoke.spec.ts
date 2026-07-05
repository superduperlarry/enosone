import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The Phase A smoke: sign in → create agent → vault card → set policy →
 * spend within limit (completed) → spend above limit (held) → approve →
 * attributed activity. Mirrors the kickoff acceptance flow exactly.
 */

const OTP_FILE = path.resolve(__dirname, "../../.e2e/otp.txt");

async function readOtp(): Promise<string> {
  for (let i = 0; i < 40; i++) {
    try {
      const otp = (await readFile(OTP_FILE, "utf8")).trim();
      if (otp.length >= 6) return otp;
    } catch {
      // not written yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("OTP file never appeared — is E2E_TEST_MODE set?");
}

async function raiseSpend(
  page: Page,
  agentUrl: string,
  amount: string,
  counterparty: string,
) {
  await page.goto(`${agentUrl}/spend`);
  await page.fill("#amount", amount);
  await page.fill("#counterparty", counterparty);
  await page.getByRole("button", { name: "Raise spend intent" }).click();
}

test("agent spend lifecycle: within limit, above limit, approve", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@test.dev`;

  // ── Sign in with email OTP (session lands in an HttpOnly cookie) ──
  await page.goto("/sign-in");
  await page.fill("#email", email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.locator("#otp")).toBeVisible({ timeout: 20_000 });
  await page.fill("#otp", await readOtp());
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/agents", { timeout: 30_000 });

  // Hard rule check: nothing auth-shaped in browser storage.
  const storage = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  expect(storage).toBe("{}");

  // ── Create an agent ──
  await page.goto("/agents/new");
  await page.fill("#displayName", "E2E Agent");
  await page.getByRole("button", { name: "Create agent" }).click();
  await page.waitForURL(/\/agents\/agt_/, { timeout: 30_000 });
  const agentUrl = new URL(page.url()).pathname;

  // ── Vault a (simulated) card ──
  await page.goto("/wallet");
  await page
    .getByRole("button", { name: "Add simulated test card" })
    .click();
  await expect(page.getByText("•••• 4242")).toBeVisible({ timeout: 15_000 });

  // ── Set policy v1: per-tx 50, no new-counterparty approvals ──
  await page.goto(`${agentUrl}/policy`);
  await expect(page.getByText("version 0", { exact: true })).toBeVisible();
  await page.fill("#per_transaction", "50.00");
  await page
    .getByLabel("Require approval for new counterparties")
    .uncheck();
  await page.getByRole("button", { name: /Save policy/ }).click();
  await expect(page.getByText("Saved as version 1")).toBeVisible({
    timeout: 15_000,
  });

  // ── Spend within limit → executes on the vaulted method ──
  await raiseSpend(page, agentUrl, "10.00", "Figma");
  await expect(page.getByText("USD 10.00 → Figma")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("completed", { exact: true })).toBeVisible();

  // ── Spend above limit → held object, never an error ──
  await raiseSpend(page, agentUrl, "75.00", "AWS");
  await expect(
    page.getByText("Held for your approval — not an error"),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("per_transaction_limit").first()).toBeVisible();

  // ── Approve it ──
  await page.goto("/approvals");
  await expect(page.getByText("USD 75.00 to AWS")).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("Nothing waiting on you")).toBeVisible({
    timeout: 15_000,
  });

  // ── Activity: everything attributed to agent + credential ──
  await page.goto("/activity");
  await expect(
    page.getByText("payment.completed").first(),
  ).toBeVisible();
  await expect(page.getByText("approval.decided").first()).toBeVisible();
  await expect(page.getByText(/crd_ws_/).first()).toBeVisible();
  await expect(page.getByText(/crd_owner_/).first()).toBeVisible();
});
