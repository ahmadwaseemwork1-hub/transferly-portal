import { describe, it, expect } from "vitest";
import { convertAmount, findRateForDate, sumInCurrency } from "../currency";
import type { ExchangeRate } from "../types";

const RATES: ExchangeRate[] = [
  { id: "1", rate_date: "2026-06-01", pkr_per_usd: 280, entered_by: null, created_at: "" },
  { id: "2", rate_date: "2026-07-01", pkr_per_usd: 278.5, entered_by: null, created_at: "" },
];

describe("convertAmount", () => {
  it("returns the same amount when currencies match", () => {
    expect(convertAmount(100, "USD", "USD", 280)).toBe(100);
  });

  it("converts USD to PKR by multiplying", () => {
    expect(convertAmount(10, "USD", "PKR", 280)).toBe(2800);
  });

  it("converts PKR to USD by dividing", () => {
    expect(convertAmount(2800, "PKR", "USD", 280)).toBe(10);
  });
});

describe("findRateForDate", () => {
  it("finds an exact date match", () => {
    expect(findRateForDate("2026-07-01", RATES)).toBe(278.5);
  });

  it("returns null instead of guessing the nearest date", () => {
    expect(findRateForDate("2026-07-02", RATES)).toBeNull();
  });
});

describe("sumInCurrency", () => {
  it("sums same-currency items with no rate needed", () => {
    const result = sumInCurrency(
      [
        { date: "2026-07-01", amount: 100, currency: "USD" },
        { date: "2026-07-02", amount: 50, currency: "USD" },
      ],
      "USD",
      []
    );
    expect(result.total).toBe(150);
    expect(result.missingDates).toHaveLength(0);
  });

  it("converts items using the exact date's rate", () => {
    const result = sumInCurrency(
      [{ date: "2026-07-01", amount: 10, currency: "USD" }],
      "PKR",
      RATES
    );
    expect(result.total).toBe(2785);
  });

  it("excludes amounts from the total and reports missing dates instead of guessing", () => {
    const result = sumInCurrency(
      [
        { date: "2026-07-01", amount: 10, currency: "USD" }, // has a rate
        { date: "2026-08-15", amount: 20, currency: "USD" }, // no rate
      ],
      "PKR",
      RATES
    );
    expect(result.total).toBe(2785); // only the covered one
    expect(result.missingDates).toEqual(["2026-08-15"]);
  });

  it("deduplicates missing dates across multiple items", () => {
    const result = sumInCurrency(
      [
        { date: "2026-08-15", amount: 10, currency: "USD" },
        { date: "2026-08-15", amount: 20, currency: "USD" },
      ],
      "PKR",
      RATES
    );
    expect(result.missingDates).toEqual(["2026-08-15"]);
  });

  it("mixes native-currency and converted items correctly", () => {
    const result = sumInCurrency(
      [
        { date: "2026-07-01", amount: 1000, currency: "PKR" }, // native, no conversion
        { date: "2026-07-01", amount: 10, currency: "USD" }, // converts to 2785 PKR
      ],
      "PKR",
      RATES
    );
    expect(result.total).toBe(3785);
  });
});
