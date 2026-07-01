import { describe, it, expect } from "vitest";
import { getWeekRange, getMonthRange, computeStats, computeAdminOverview } from "../stats";
import type { Transfer } from "../types";

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
    ...overrides,
  };
}

describe("getWeekRange", () => {
  it("returns Monday-Sunday for a mid-week date", () => {
    // 2026-07-01 is a Wednesday
    const { start, end } = getWeekRange("2026-07-01");
    expect(start).toBe("2026-06-29"); // Monday
    expect(end).toBe("2026-07-05"); // Sunday
  });

  it("handles a Sunday reference date correctly", () => {
    const { start, end } = getWeekRange("2026-07-05");
    expect(start).toBe("2026-06-29");
    expect(end).toBe("2026-07-05");
  });
});

describe("getMonthRange", () => {
  it("returns first and last day of the month", () => {
    const { start, end } = getMonthRange("2026-07-15");
    expect(start).toBe("2026-07-01");
    expect(end).toBe("2026-07-31");
  });

  it("handles February in a leap year", () => {
    const { start, end } = getMonthRange("2028-02-10");
    expect(start).toBe("2028-02-01");
    expect(end).toBe("2028-02-29");
  });
});

describe("computeStats", () => {
  const today = "2026-07-01"; // Wednesday

  it("counts today, this week, and this month correctly", () => {
    const transfers = [
      makeTransfer({ transfer_date: "2026-07-01", status: "accepted" }), // today, this week, this month
      makeTransfer({ transfer_date: "2026-06-30", status: "pending" }), // this week only (June, not July)
      makeTransfer({ transfer_date: "2026-07-15", status: "declined" }), // this month only
      makeTransfer({ transfer_date: "2026-05-31", status: "accepted" }), // outside week and month
    ];
    const stats = computeStats(transfers, today);
    expect(stats.dailyCount).toBe(1);
    expect(stats.weeklyCount).toBe(2);
    expect(stats.monthlyCount).toBe(2);
  });

  it("computes credit pending as accepted + not invoiced only", () => {
    const transfers = [
      makeTransfer({ status: "accepted", invoice_id: null, value: 100 }),
      makeTransfer({ status: "accepted", invoice_id: "inv-1", value: 200 }),
      makeTransfer({ status: "declined", invoice_id: null, value: 300 }),
      makeTransfer({ status: "pending", invoice_id: null, value: 400 }),
    ];
    const stats = computeStats(transfers, today);
    expect(stats.creditPending).toBe(100);
  });

  it("breaks down today's transfers by status", () => {
    const transfers = [
      makeTransfer({ transfer_date: today, status: "accepted" }),
      makeTransfer({ transfer_date: today, status: "accepted" }),
      makeTransfer({ transfer_date: today, status: "pending" }),
      makeTransfer({ transfer_date: today, status: "declined" }),
    ];
    const stats = computeStats(transfers, today);
    expect(stats.dailyAccepted).toBe(2);
    expect(stats.dailyPending).toBe(1);
    expect(stats.dailyDeclined).toBe(1);
  });

  it("returns all zeros for an empty transfer list", () => {
    const stats = computeStats([], today);
    expect(stats.dailyCount).toBe(0);
    expect(stats.weeklyCount).toBe(0);
    expect(stats.monthlyCount).toBe(0);
    expect(stats.creditPending).toBe(0);
  });
});

describe("computeAdminOverview", () => {
  it("aggregates across multiple clients", () => {
    const today = "2026-07-01";
    const transfers = [
      makeTransfer({ client_id: "a", transfer_date: today, status: "accepted", value: 50 }),
      makeTransfer({ client_id: "b", transfer_date: today, status: "pending", value: 60 }),
      makeTransfer({ client_id: "a", transfer_date: "2026-06-01", status: "accepted", value: 999 }),
    ];
    const overview = computeAdminOverview(transfers, today);
    expect(overview.totalToday).toBe(2);
    expect(overview.acceptedToday).toBe(1);
    expect(overview.pendingToday).toBe(1);
    expect(overview.totalCreditPending).toBe(50 + 999);
  });
});
