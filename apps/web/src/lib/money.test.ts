import { describe, expect, it } from "vitest";
import { add, gt, lte, money, toMinorUnits, zero } from "./money";

describe("money", () => {
  it("normalizes decimal strings to 2dp", () => {
    expect(money("25", "USD")).toEqual({ amount: "25.00", currency: "USD" });
    expect(money("0.1", "USD").amount).toBe("0.10");
  });

  it("rejects float-ish garbage", () => {
    expect(() => money("25.5.5", "USD")).toThrow();
    expect(() => money("1e5", "USD")).toThrow();
    expect(() => money("", "USD")).toThrow();
  });

  it("adds without binary float drift (0.10 + 0.20 = 0.30)", () => {
    const sum = add(money("0.10", "USD"), money("0.20", "USD"));
    expect(sum.amount).toBe("0.30"); // 0.1 + 0.2 !== 0.30000000000000004
  });

  it("compares decimals exactly", () => {
    expect(gt(money("50.01", "USD"), money("50.00", "USD"))).toBe(true);
    expect(gt(money("50.00", "USD"), money("50.00", "USD"))).toBe(false);
    expect(lte(money("50.00", "USD"), money("50.00", "USD"))).toBe(true);
  });

  it("refuses cross-currency math", () => {
    expect(() => add(money("1", "USD"), money("1", "EUR"))).toThrow(
      /Currency mismatch/,
    );
    expect(() => gt(money("1", "USD"), zero("PHP"))).toThrow();
  });

  it("converts to minor units exactly", () => {
    expect(toMinorUnits(money("19.99", "USD"))).toBe(1999);
    expect(toMinorUnits(money("0.10", "USD"))).toBe(10);
    expect(() => toMinorUnits({ amount: "1.005", currency: "USD" })).toThrow(
      /sub-cent/,
    );
  });
});
