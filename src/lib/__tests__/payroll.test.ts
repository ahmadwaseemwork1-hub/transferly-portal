import { describe, it, expect } from "vitest";
import { computeDailyPay, computeEmployeePayroll } from "../payroll";
import type { Transfer, BonusTier } from "../types";

const TIERS: BonusTier[] = [
  { min_transfers: 5, flat_amount: 3000 },
  { min_transfers: 10, flat_amount: 7000 },
];
const BASE_RATE = 1000;

function makeTransfer(overrides: Partial<Transfer>): Transfer {
  return {
    id: crypto.randomUUID(),
    client_id: "client-1",
    transfer_date: "2026-07-01",
    transfer_time: null,
    lead_name: null,
    phone: null,
    state: null,
    insurance_type: null,
    value: 50,
    notes: null,
    status: "pending",
    decline_reason: null,
    responded_at: null,
    invoice_id: null,
    created_by: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    date_of_birth: null,
    address: null,
    zip_code: null,
    home_status: null,
    vehicle_count: null,
    vehicles: null,
    current_carrier: null,
    policy_term: null,
    billing_status: null,
    billing_decided_at: null,
    billing_decided_by: null,
    email: null,
    city: null,
    lead_extra: [],
    submitted_by: "employee-1",
    employee_approved: true,
    employee_approved_at: null,
    employee_approved_by: null,
    ...overrides,
  };
}

describe("computeDailyPay — the confirmed 1k/3k/7k rule", () => {
  it("pays per-transfer below the lowest tier", () => {
    expect(computeDailyPay(BASE_RATE, TIERS, 1)).toBe(1000);
    expect(computeDailyPay(BASE_RATE, TIERS, 4)).toBe(4000);
  });

  it("pays a flat 3000 at exactly 5, not 5000", () => {
    expect(computeDailyPay(BASE_RATE, TIERS, 5)).toBe(3000);
  });

  it("stays at flat 3000 between 5 and 9", () => {
    expect(computeDailyPay(BASE_RATE, TIERS, 6)).toBe(3000);
    expect(computeDailyPay(BASE_RATE, TIERS, 9)).toBe(3000);
  });

  it("pays a flat 7000 at exactly 10, not 10000 or 3000", () => {
    expect(computeDailyPay(BASE_RATE, TIERS, 10)).toBe(7000);
  });

  it("stays at the highest defined tier above its threshold", () => {
    expect(computeDailyPay(BASE_RATE, TIERS, 20)).toBe(7000);
  });

  it("returns 0 for zero or negative counts", () => {
    expect(computeDailyPay(BASE_RATE, TIERS, 0)).toBe(0);
    expect(computeDailyPay(BASE_RATE, TIERS, -1)).toBe(0);
  });

  it("falls back to pure per-transfer pay when there are no tiers configured", () => {
    expect(computeDailyPay(BASE_RATE, [], 12)).toBe(12000);
  });

  it("is not required to be monotonic — 5 legitimately pays less than 4", () => {
    const payAt4 = computeDailyPay(BASE_RATE, TIERS, 4);
    const payAt5 = computeDailyPay(BASE_RATE, TIERS, 5);
    expect(payAt4).toBe(4000);
    expect(payAt5).toBe(3000);
    expect(payAt5).toBeLessThan(payAt4);
  });
});

describe("computeEmployeePayroll", () => {
  it("only counts employee_approved transfers", () => {
    const transfers = [
      makeTransfer({ transfer_date: "2026-07-01", employee_approved: true }),
      makeTransfer({ transfer_date: "2026-07-01", employee_approved: false }),
    ];
    const result = computeEmployeePayroll(BASE_RATE, TIERS, transfers);
    expect(result.totalTransfers).toBe(1);
    expect(result.totalPkr).toBe(1000);
  });

  it("applies the tier rule per day, not summed across the whole period", () => {
    // 3 transfers on day 1 (per-transfer), 5 on day 2 (hits tier)
    const transfers = [
      ...Array.from({ length: 3 }, () =>
        makeTransfer({ transfer_date: "2026-07-01" })
      ),
      ...Array.from({ length: 5 }, () =>
        makeTransfer({ transfer_date: "2026-07-02" })
      ),
    ];
    const result = computeEmployeePayroll(BASE_RATE, TIERS, transfers);
    // day 1: 3 x 1000 = 3000, day 2: flat 3000 (tier) = 3000, total 6000
    expect(result.totalPkr).toBe(6000);
    expect(result.byDate).toHaveLength(2);
    const day1 = result.byDate.find((d) => d.date === "2026-07-01");
    const day2 = result.byDate.find((d) => d.date === "2026-07-02");
    expect(day1?.amountPkr).toBe(3000);
    expect(day2?.amountPkr).toBe(3000);
  });

  it("returns zero totals for an employee with no approved transfers", () => {
    const result = computeEmployeePayroll(BASE_RATE, TIERS, []);
    expect(result.totalPkr).toBe(0);
    expect(result.totalTransfers).toBe(0);
    expect(result.byDate).toHaveLength(0);
  });

  it("sorts byDate most recent first", () => {
    const transfers = [
      makeTransfer({ transfer_date: "2026-07-01" }),
      makeTransfer({ transfer_date: "2026-07-03" }),
      makeTransfer({ transfer_date: "2026-07-02" }),
    ];
    const result = computeEmployeePayroll(BASE_RATE, TIERS, transfers);
    expect(result.byDate.map((d) => d.date)).toEqual([
      "2026-07-03",
      "2026-07-02",
      "2026-07-01",
    ]);
  });
});
