"use client";

import type { SpendResult } from "@enos/agentos-client";
import { Button, StatusBadge } from "@enos/ui";
import Link from "next/link";
import { useActionState } from "react";
import { SPEND_CATEGORIES } from "@/lib/spend-categories";
import { raiseSpendIntent } from "@/server/actions/spend";

function ResultCard({ result }: { result: SpendResult }) {
  if (result.outcome === "policy_denied") {
    return (
      <div className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3">
        <p className="font-ui text-sm font-medium text-danger">
          Denied by policy ({result.rule})
        </p>
        <p className="mt-1 font-body text-sm text-gray-600">{result.message}</p>
      </div>
    );
  }
  if (result.outcome === "pending_approval") {
    return (
      <div className="rounded-lg border border-lime bg-lime/10 px-4 py-3">
        <p className="font-ui text-sm font-medium text-evergreen">
          Held for your approval — not an error
        </p>
        <p className="mt-1 font-body text-sm text-gray-600">
          Rule <code>{result.approval.trigger}</code> held this payment.
          Decide it in{" "}
          <Link className="text-teal underline" href="/approvals">
            Approvals
          </Link>
          .
        </p>
      </div>
    );
  }
  const p = result.payment;
  return (
    <div className="rounded-lg border border-evergreen-100 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <StatusBadge status={p.status} />
        <span className="font-ui text-sm text-evergreen">
          {p.source_amount.currency} {p.source_amount.amount} →{" "}
          {p.counterparty_id}
        </span>
      </div>
      {p.failure_reason ? (
        <p className="mt-1 font-body text-sm text-danger">{p.failure_reason}</p>
      ) : null}
    </div>
  );
}

export function SpendForm({ agentId }: { agentId: string }) {
  const [result, formAction, pending] = useActionState<
    SpendResult | null,
    FormData
  >(raiseSpendIntent, null);

  return (
    <div className="max-w-xl">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="agentId" value={agentId} />
        <input type="hidden" name="currency" value="USD" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-ui text-sm text-gray-600" htmlFor="amount">
              Amount (USD)
            </label>
            <input
              id="amount"
              name="amount"
              required
              inputMode="decimal"
              placeholder="25.00"
              pattern="^\d+(\.\d{1,2})?$"
              className="mt-1 w-full rounded-lg border border-evergreen-100 px-4 py-2.5 font-body text-sm outline-none focus:border-teal"
            />
          </div>
          <div>
            <label className="font-ui text-sm text-gray-600" htmlFor="category">
              Category
            </label>
            <select
              id="category"
              name="category"
              className="mt-1 w-full rounded-lg border border-evergreen-100 bg-white px-4 py-2.5 font-body text-sm outline-none focus:border-teal"
            >
              {SPEND_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            className="font-ui text-sm text-gray-600"
            htmlFor="counterparty"
          >
            Service / merchant
          </label>
          <input
            id="counterparty"
            name="counterparty"
            required
            maxLength={120}
            placeholder="Figma, AWS, DHL…"
            className="mt-1 w-full rounded-lg border border-evergreen-100 px-4 py-2.5 font-body text-sm outline-none focus:border-teal"
          />
        </div>

        <div>
          <label className="font-ui text-sm text-gray-600" htmlFor="purpose">
            Purpose <span className="text-gray-400">(shown on the approval card)</span>
          </label>
          <input
            id="purpose"
            name="purpose"
            maxLength={280}
            placeholder="Why this spend"
            className="mt-1 w-full rounded-lg border border-evergreen-100 px-4 py-2.5 font-body text-sm outline-none focus:border-teal"
          />
        </div>

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Evaluating…" : "Raise spend intent"}
          </Button>
        </div>
      </form>

      {result ? (
        <div className="mt-6">
          <ResultCard result={result} />
        </div>
      ) : null}
    </div>
  );
}
