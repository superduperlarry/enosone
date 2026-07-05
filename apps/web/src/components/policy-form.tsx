"use client";

import type { PolicyCreate } from "@enos/agentos-client";
import { Button, Card } from "@enos/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SPEND_CATEGORIES } from "@/lib/spend-categories";
import { savePolicy } from "@/server/actions/policy";

/**
 * This form is shaped EXACTLY like the /v1 Policy schema (PolicyCreate):
 * limits{per_transaction,daily,monthly,max_transactions_per_day},
 * allowlists, approvals{require_approval_above,…}. Phase B swaps the local
 * store for PUT /agents/{id}/policy without touching this UI.
 */

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;
const CURRENCY = "USD";

type FormState = {
  perTransaction: string;
  daily: string;
  monthly: string;
  maxTransactionsPerDay: string;
  allCategories: boolean;
  categories: string[];
  requireApprovalAbove: string;
  requireApprovalNewCounterparties: boolean;
  requireApprovalCrossBorder: boolean;
  autoExpireHours: string;
};

function moneyField(value: string) {
  return value.trim() === ""
    ? undefined
    : { amount: value.trim(), currency: CURRENCY };
}

function MoneyInput({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const invalid = value.trim() !== "" && !AMOUNT_RE.test(value.trim());
  return (
    <div>
      <label className="font-ui text-sm text-gray-600" htmlFor={id}>
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-ui text-sm text-gray-400">{CURRENCY}</span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder="unlimited"
          className={`w-full rounded-lg border px-4 py-2.5 font-body text-sm outline-none focus:border-teal ${
            invalid ? "border-danger" : "border-evergreen-100"
          }`}
        />
      </div>
      {hint ? (
        <p className="mt-1 font-body text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function PolicyForm({
  agentId,
  version,
  initial,
}: {
  agentId: string;
  version: number;
  initial: PolicyCreate | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>({
    perTransaction: initial?.limits?.per_transaction?.amount ?? "",
    daily: initial?.limits?.daily?.amount ?? "",
    monthly: initial?.limits?.monthly?.amount ?? "",
    maxTransactionsPerDay:
      initial?.limits?.max_transactions_per_day?.toString() ?? "",
    allCategories: !initial?.merchant_category_allowlist,
    categories: initial?.merchant_category_allowlist ?? [],
    requireApprovalAbove:
      initial?.approvals?.require_approval_above?.amount ?? "",
    requireApprovalNewCounterparties:
      initial?.approvals?.require_approval_for_new_counterparties ?? true,
    requireApprovalCrossBorder:
      initial?.approvals?.require_approval_for_cross_border ?? false,
    autoExpireHours: (initial?.approvals?.auto_expire_hours ?? 72).toString(),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setSavedVersion(null);
    setForm((f) => ({ ...f, [key]: value }));
  };

  function buildDoc(): PolicyCreate | string {
    for (const [label, v] of [
      ["Per-transaction limit", form.perTransaction],
      ["Daily limit", form.daily],
      ["Monthly limit", form.monthly],
      ["Approval threshold", form.requireApprovalAbove],
    ] as const) {
      if (v.trim() !== "" && !AMOUNT_RE.test(v.trim())) {
        return `${label} must be a decimal amount like 100.00`;
      }
    }
    if (!form.allCategories && form.categories.length === 0) {
      return "Pick at least one category, or allow all categories.";
    }
    return {
      limits: {
        per_transaction: moneyField(form.perTransaction),
        daily: moneyField(form.daily),
        monthly: moneyField(form.monthly),
        max_transactions_per_day:
          form.maxTransactionsPerDay.trim() === ""
            ? null
            : Number(form.maxTransactionsPerDay),
      },
      counterparty_allowlist: initial?.counterparty_allowlist ?? null,
      verified_counterparties_only:
        initial?.verified_counterparties_only ?? false,
      merchant_category_allowlist: form.allCategories ? null : form.categories,
      currency_allowlist: [CURRENCY],
      approvals: {
        require_approval_above: moneyField(form.requireApprovalAbove),
        require_approval_for_new_counterparties:
          form.requireApprovalNewCounterparties,
        require_approval_for_cross_border: form.requireApprovalCrossBorder,
        auto_expire_hours: Number(form.autoExpireHours) || 72,
      },
    };
  }

  function submit() {
    setError(null);
    const doc = buildDoc();
    if (typeof doc === "string") {
      setError(doc);
      return;
    }
    startTransition(async () => {
      const policy = await savePolicy(agentId, doc);
      setSavedVersion(policy.version);
      router.refresh();
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {version === 0 ? (
        <div className="rounded-lg border border-lime bg-lime/10 px-4 py-3 font-body text-sm text-evergreen-700">
          This agent is on <strong>version 0 — deny-all</strong>. It can&apos;t
          spend anything until you save its first policy.
        </div>
      ) : null}

      <Card>
        <h2 className="font-ui text-sm font-medium uppercase tracking-wider text-evergreen-700">
          Limits
        </h2>
        <p className="mt-1 font-body text-xs text-gray-400">
          Blank = unlimited for that dimension (not recommended). Amounts in
          the account currency ({CURRENCY}).
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <MoneyInput
            id="per_transaction"
            label="Per transaction"
            value={form.perTransaction}
            onChange={(v) => set("perTransaction", v)}
          />
          <MoneyInput
            id="daily"
            label="Daily"
            value={form.daily}
            onChange={(v) => set("daily", v)}
          />
          <MoneyInput
            id="monthly"
            label="Monthly"
            value={form.monthly}
            onChange={(v) => set("monthly", v)}
          />
          <div>
            <label
              className="font-ui text-sm text-gray-600"
              htmlFor="max_transactions_per_day"
            >
              Max transactions / day
            </label>
            <input
              id="max_transactions_per_day"
              value={form.maxTransactionsPerDay}
              onChange={(e) =>
                set(
                  "maxTransactionsPerDay",
                  e.target.value.replace(/\D/g, ""),
                )
              }
              inputMode="numeric"
              placeholder="unlimited"
              className="mt-1 w-full rounded-lg border border-evergreen-100 px-4 py-2.5 font-body text-sm outline-none focus:border-teal"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-ui text-sm font-medium uppercase tracking-wider text-evergreen-700">
          Category allowlist
        </h2>
        <label className="mt-3 flex items-center gap-2 font-body text-sm">
          <input
            type="checkbox"
            checked={form.allCategories}
            onChange={(e) => set("allCategories", e.target.checked)}
          />
          Allow all categories
        </label>
        {!form.allCategories ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SPEND_CATEGORIES.map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 font-body text-sm"
              >
                <input
                  type="checkbox"
                  checked={form.categories.includes(c)}
                  onChange={(e) =>
                    set(
                      "categories",
                      e.target.checked
                        ? [...form.categories, c]
                        : form.categories.filter((x) => x !== c),
                    )
                  }
                />
                {c.replaceAll("_", " ")}
              </label>
            ))}
          </div>
        ) : null}
        <p className="mt-3 font-body text-xs text-gray-400">
          Spends outside the allowlist are held for your approval — never
          silently dropped.
        </p>
      </Card>

      <Card>
        <h2 className="font-ui text-sm font-medium uppercase tracking-wider text-evergreen-700">
          Approvals
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <MoneyInput
            id="require_approval_above"
            label="Require approval above"
            hint="Held for you even when within limits."
            value={form.requireApprovalAbove}
            onChange={(v) => set("requireApprovalAbove", v)}
          />
          <div>
            <label
              className="font-ui text-sm text-gray-600"
              htmlFor="auto_expire_hours"
            >
              Pending approvals expire after (hours)
            </label>
            <input
              id="auto_expire_hours"
              value={form.autoExpireHours}
              onChange={(e) =>
                set("autoExpireHours", e.target.value.replace(/\D/g, ""))
              }
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-evergreen-100 px-4 py-2.5 font-body text-sm outline-none focus:border-teal"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <label className="flex items-center gap-2 font-body text-sm">
            <input
              type="checkbox"
              checked={form.requireApprovalNewCounterparties}
              onChange={(e) =>
                set("requireApprovalNewCounterparties", e.target.checked)
              }
            />
            Require approval for new counterparties
          </label>
          <label className="flex items-center gap-2 font-body text-sm">
            <input
              type="checkbox"
              checked={form.requireApprovalCrossBorder}
              onChange={(e) =>
                set("requireApprovalCrossBorder", e.target.checked)
              }
            />
            Require approval for cross-border payments
          </label>
        </div>
      </Card>

      {error ? <p className="font-body text-sm text-danger">{error}</p> : null}
      {savedVersion != null ? (
        <p className="font-body text-sm text-positive">
          Saved as version {savedVersion}. Applies to new spends immediately.
        </p>
      ) : null}

      <div>
        <Button onClick={submit} disabled={pending}>
          {pending
            ? "Saving…"
            : version === 0
              ? "Save policy (version 1)"
              : `Replace policy (version ${version + 1})`}
        </Button>
        <p className="mt-2 font-body text-xs text-gray-400">
          Policies are replaced whole, never patched — every save is a new
          immutable version. Prior versions stay in the activity feed.
        </p>
      </div>
    </div>
  );
}
