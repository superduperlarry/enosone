"use client";

import { Button } from "@enos/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Step = "email" | "otp";

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setBusy(true);
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    setBusy(false);
    if (error) {
      setError(error.message ?? "Could not send the code. Try again.");
      return;
    }
    setStep("otp");
  }

  async function verifyCode() {
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.emailOtp({ email, otp });
    setBusy(false);
    if (error) {
      setError(error.message ?? "That code didn't match. Try again.");
      return;
    }
    router.push("/agents");
  }

  async function signInWithPasskey() {
    setError(null);
    const result = await authClient.signIn.passkey();
    if (result?.error) {
      setError(result.error.message ?? "Passkey sign-in failed.");
      return;
    }
    router.push("/agents");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-evergreen px-6">
      <div className="w-full max-w-md rounded-card bg-white p-8 shadow-lg">
        <Link
          href="/"
          className="font-display text-2xl lowercase tracking-tight text-evergreen"
        >
          enos
        </Link>
        <h1 className="mt-6 font-display text-3xl text-evergreen">Sign in</h1>

        {step === "email" ? (
          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
          >
            <label className="font-ui text-sm text-gray-600" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email webauthn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-lg border border-evergreen-100 px-4 py-2.5 font-body text-sm outline-none focus:border-teal"
            />
            <Button type="submit" disabled={busy || !email}>
              {busy ? "Sending…" : "Email me a code"}
            </Button>
            <div className="relative my-2 text-center font-ui text-xs text-gray-400">
              <span className="bg-white px-2">or</span>
              <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-evergreen-100" />
            </div>
            <Button variant="ghost" onClick={() => void signInWithPasskey()}>
              Sign in with a passkey
            </Button>
          </form>
        ) : (
          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void verifyCode();
            }}
          >
            <p className="font-body text-sm text-gray-600">
              We sent a 6-digit code to <strong>{email}</strong>.
            </p>
            <input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              className="rounded-lg border border-evergreen-100 px-4 py-2.5 text-center font-ui text-lg tracking-[0.4em] outline-none focus:border-teal"
            />
            <Button type="submit" disabled={busy || otp.length < 6}>
              {busy ? "Checking…" : "Sign in"}
            </Button>
            <button
              type="button"
              className="font-ui text-xs text-gray-500 underline"
              onClick={() => setStep("email")}
            >
              Use a different email
            </button>
          </form>
        )}

        {error ? (
          <p className="mt-4 font-body text-sm text-danger">{error}</p>
        ) : null}

        <p className="mt-8 font-body text-xs text-gray-400">
          New here? Signing in with your email creates your account. Sessions
          are kept in secure HttpOnly cookies — never in browser storage.
        </p>
      </div>
    </main>
  );
}
