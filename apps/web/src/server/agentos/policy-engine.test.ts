import type { PolicyCreate } from "@enos/agentos-client";
import { describe, expect, it } from "vitest";
import { money, zero } from "@/lib/money";
import { evaluatePolicy, type EvaluationInput } from "./policy-engine";

const openPolicy: PolicyCreate = {
  limits: {
    per_transaction: money("50.00", "USD"),
    daily: money("200.00", "USD"),
    monthly: money("1000.00", "USD"),
    max_transactions_per_day: 10,
  },
  merchant_category_allowlist: null,
  currency_allowlist: ["USD"],
  approvals: {
    require_approval_above: money("100.00", "USD"),
    require_approval_for_new_counterparties: false,
    auto_expire_hours: 72,
  },
};

function input(overrides: Partial<EvaluationInput>): EvaluationInput {
  return {
    policy: openPolicy,
    amount: money("10.00", "USD"),
    category: "software_services",
    counterparty: "Figma",
    isNewCounterparty: false,
    spentToday: zero("USD"),
    spentMonth: zero("USD"),
    transactionsToday: 0,
    ...overrides,
  };
}

describe("evaluatePolicy — allow paths", () => {
  it("allows a spend within every limit", () => {
    expect(evaluatePolicy(input({}))).toEqual({ decision: "allow" });
  });

  it("allows exactly at the per-transaction limit (not above)", () => {
    expect(
      evaluatePolicy(input({ amount: money("50.00", "USD") })),
    ).toEqual({ decision: "allow" });
  });

  it("allows when daily spend lands exactly on the limit", () => {
    expect(
      evaluatePolicy(
        input({
          amount: money("50.00", "USD"),
          spentToday: money("150.00", "USD"),
        }),
      ),
    ).toEqual({ decision: "allow" });
  });
});

describe("evaluatePolicy — deny paths", () => {
  it("denies everything on version 0 (no policy)", () => {
    const result = evaluatePolicy(input({ policy: null }));
    expect(result.decision).toBe("deny");
    expect(result).toMatchObject({ rule: "default_deny_all" });
  });

  it("hard-denies a currency outside the allowlist", () => {
    const result = evaluatePolicy(input({ amount: money("10.00", "EUR") }));
    expect(result).toMatchObject({
      decision: "deny",
      rule: "currency_allowlist",
    });
  });

  it("denies non-positive amounts", () => {
    expect(
      evaluatePolicy(input({ amount: { amount: "-5.00", currency: "USD" } })),
    ).toMatchObject({ decision: "deny", rule: "validation_error" });
  });
});

describe("evaluatePolicy — hold paths (202, never errors)", () => {
  it("holds above the per-transaction limit", () => {
    expect(
      evaluatePolicy(input({ amount: money("50.01", "USD") })),
    ).toMatchObject({ decision: "hold", trigger: "per_transaction_limit" });
  });

  it("holds when the daily limit would be exceeded — decimal-exact", () => {
    // 199.90 spent + 0.20 = 200.10 > 200.00; floats would say 200.10000000000002 either way,
    // but 199.80 + 0.20 = 200.00 must NOT hold.
    expect(
      evaluatePolicy(
        input({
          amount: money("0.20", "USD"),
          spentToday: money("199.90", "USD"),
        }),
      ),
    ).toMatchObject({ decision: "hold", trigger: "daily_limit" });
    expect(
      evaluatePolicy(
        input({
          amount: money("0.20", "USD"),
          spentToday: money("199.80", "USD"),
        }),
      ),
    ).toEqual({ decision: "allow" });
  });

  it("holds when the monthly limit would be exceeded", () => {
    expect(
      evaluatePolicy(
        input({
          amount: money("10.00", "USD"),
          spentMonth: money("995.00", "USD"),
        }),
      ),
    ).toMatchObject({ decision: "hold", trigger: "monthly_limit" });
  });

  it("holds at the daily velocity cap", () => {
    expect(
      evaluatePolicy(input({ transactionsToday: 10 })),
    ).toMatchObject({ decision: "hold", trigger: "velocity_limit" });
  });

  it("holds categories outside the allowlist", () => {
    expect(
      evaluatePolicy(
        input({
          policy: {
            ...openPolicy,
            merchant_category_allowlist: ["software_services"],
          },
          category: "travel",
        }),
      ),
    ).toMatchObject({ decision: "hold", trigger: "merchant_category" });
  });

  it("holds above the approval threshold even within limits", () => {
    expect(
      evaluatePolicy(
        input({
          policy: {
            ...openPolicy,
            limits: { per_transaction: money("500.00", "USD") },
          },
          amount: money("100.01", "USD"),
        }),
      ),
    ).toMatchObject({ decision: "hold", trigger: "require_approval_above" });
  });

  it("holds first payment to a new counterparty when required", () => {
    expect(
      evaluatePolicy(
        input({
          policy: {
            ...openPolicy,
            approvals: {
              ...openPolicy.approvals,
              require_approval_for_new_counterparties: true,
            },
          },
          isNewCounterparty: true,
        }),
      ),
    ).toMatchObject({ decision: "hold", trigger: "new_counterparty" });
  });

  it("defaults new-counterparty approval to true when unspecified (spec default)", () => {
    expect(
      evaluatePolicy(
        input({
          policy: { ...openPolicy, approvals: {} },
          isNewCounterparty: true,
        }),
      ),
    ).toMatchObject({ decision: "hold", trigger: "new_counterparty" });
  });
});
