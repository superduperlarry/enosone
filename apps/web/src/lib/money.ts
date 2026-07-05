import Big from "big.js";

/**
 * THE money module. All money arithmetic and comparison in ENOS One goes
 * through here — decimal strings in, decimal strings out, matching the /v1
 * Money schema. Using floats (or doing arithmetic on amounts anywhere else)
 * is a rejected change; CI greps for it.
 */
export type Money = {
  /** Decimal string, e.g. "1500.00". Never a float. */
  amount: string;
  /** ISO 4217, e.g. "USD". */
  currency: string;
};

const AMOUNT_RE = /^-?\d+(\.\d+)?$/;

export function isValidAmount(amount: string): boolean {
  return AMOUNT_RE.test(amount);
}

export function money(amount: string, currency: string): Money {
  if (!isValidAmount(amount)) throw new Error(`Invalid amount: ${amount}`);
  return { amount: new Big(amount).toFixed(2), currency };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: new Big(a.amount).plus(b.amount).toFixed(2), currency: a.currency };
}

/** a > b */
export function gt(a: Money, b: Money): boolean {
  assertSameCurrency(a, b);
  return new Big(a.amount).gt(b.amount);
}

/** a <= b */
export function lte(a: Money, b: Money): boolean {
  assertSameCurrency(a, b);
  return new Big(a.amount).lte(b.amount);
}

export function zero(currency: string): Money {
  return { amount: "0.00", currency };
}

export function fmt(m: Money): string {
  return `${m.currency} ${m.amount}`;
}

/** Processor minor units (cents) — exact conversion, throws on sub-cent. */
export function toMinorUnits(m: Money): number {
  const minor = new Big(m.amount).times(100);
  if (!minor.eq(minor.round(0))) {
    throw new Error(`Amount ${m.amount} has sub-cent precision`);
  }
  return Number(minor.toFixed(0));
}
