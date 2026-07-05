import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { db } from "./db";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

/**
 * Session lives in an HttpOnly cookie (Better Auth default) — hard rule:
 * no tokens in localStorage/sessionStorage, ever.
 */
export const auth = betterAuth({
  baseURL,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        // Phase A dev mailer: surface the code in the server console.
        // Real mail provider lands with Phase B hosting cutover.
        console.log(`[enos-auth] ${type} code for ${email}: ${otp}`);
        if (process.env.E2E_TEST_MODE === "1") {
          // Playwright reads the code from disk — dev/e2e only.
          const { mkdir, writeFile } = await import("node:fs/promises");
          await mkdir(".e2e", { recursive: true });
          await writeFile(".e2e/otp.txt", otp, "utf8");
        }
      },
    }),
    passkey({
      rpID: new URL(baseURL).hostname,
      rpName: "ENOS One",
      origin: baseURL,
    }),
    // Must stay last: applies Set-Cookie in Next.js server actions.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
