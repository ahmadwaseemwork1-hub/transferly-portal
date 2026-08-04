import type { Currency, ExchangeRate } from "./types";

/** Convention: pkr_per_usd = how many PKR equal 1 USD. */
export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  pkrPerUsd: number
): number {
  if (from === to) return amount;
  if (from === "USD" && to === "PKR") return amount * pkrPerUsd;
  if (from === "PKR" && to === "USD") return amount / pkrPerUsd;
  return amount;
}

/** Exact-date lookup only — no "nearest date" fallback. A missing rate for
 * a date must surface as missing, never get silently approximated from a
 * different day's rate, or historical figures quietly drift. */
export function findRateForDate(dateISO: string, rates: ExchangeRate[]): number | null {
  const match = rates.find((r) => r.rate_date === dateISO);
  return match ? match.pkr_per_usd : null;
}

export interface CurrencyLineItem {
  date: string;
  amount: number;
  currency: Currency;
}

export interface ConversionResult {
  total: number;
  /** Unique dates that need a rate entered before the total is accurate.
   * Amounts on these dates are excluded from `total`, not guessed at. */
  missingDates: string[];
}

export function sumInCurrency(
  items: CurrencyLineItem[],
  targetCurrency: Currency,
  rates: ExchangeRate[]
): ConversionResult {
  let total = 0;
  const missing = new Set<string>();

  for (const item of items) {
    if (item.currency === targetCurrency) {
      total += item.amount;
      continue;
    }
    const rate = findRateForDate(item.date, rates);
    if (rate === null) {
      missing.add(item.date);
      continue;
    }
    total += convertAmount(item.amount, item.currency, targetCurrency, rate);
  }

  return { total: Math.round(total * 100) / 100, missingDates: Array.from(missing).sort() };
}
