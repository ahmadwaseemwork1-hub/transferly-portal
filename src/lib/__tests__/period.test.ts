import { describe, it, expect } from "vitest";
import { getPeriodRange, isWithinRange } from "../period";

describe("getPeriodRange", () => {
  const ref = "2026-07-15"; // Wednesday, mid-month, mid-year

  it("today", () => {
    expect(getPeriodRange("today", ref)).toEqual({ start: ref, end: ref });
  });

  it("week (Monday-Sunday)", () => {
    expect(getPeriodRange("week", ref)).toEqual({ start: "2026-07-13", end: "2026-07-19" });
  });

  it("month", () => {
    expect(getPeriodRange("month", ref)).toEqual({ start: "2026-07-01", end: "2026-07-31" });
  });

  it("6months ending in the reference month", () => {
    expect(getPeriodRange("6months", ref)).toEqual({ start: "2026-02-01", end: "2026-07-31" });
  });

  it("6months spanning a year boundary", () => {
    expect(getPeriodRange("6months", "2026-02-10")).toEqual({
      start: "2025-09-01",
      end: "2026-02-28",
    });
  });

  it("year", () => {
    expect(getPeriodRange("year", ref)).toEqual({ start: "2026-01-01", end: "2026-12-31" });
  });
});

describe("isWithinRange", () => {
  it("includes both boundary dates", () => {
    const range = { start: "2026-07-01", end: "2026-07-31" };
    expect(isWithinRange("2026-07-01", range)).toBe(true);
    expect(isWithinRange("2026-07-31", range)).toBe(true);
    expect(isWithinRange("2026-06-30", range)).toBe(false);
    expect(isWithinRange("2026-08-01", range)).toBe(false);
  });
});
