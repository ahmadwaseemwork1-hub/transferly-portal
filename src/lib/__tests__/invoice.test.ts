import { describe, it, expect } from "vitest";
import { buildInvoiceDraft, formatInvoiceNumber } from "../invoice";
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
    dob: null,
    address: null,
    num_cars: null,
    cars: null,
    current_carrier: null,
    home_owner: null,
    submitted_by_employee_id: null,
    billable: true,
    billable_note: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildInvoiceDraft", () => {
  it("only includes accepted, uninvoiced transfers", () => {
    const transfers = [
      makeTransfer({ status: "accepted", invoice_id: null, value: 50 }),
      makeTransfer({ status: "accepted", invoice_id: "already-billed", value: 999 }),
      makeTransfer({ status: "declined", invoice_id: null, value: 999 }),
      makeTransfer({ status: "pending", invoice_id: null, value: 999 }),
    ];
    const draft = buildInvoiceDraft(transfers);
    expect(draft).not.toBeNull();
    expect(draft!.transferCount).toBe(1);
    expect(draft!.totalAmount).toBe(50);
  });

  it("excludes transfers flagged non-billable", () => {
    const transfers = [
      makeTransfer({ status: "accepted", invoice_id: null, value: 50, billable: true }),
      makeTransfer({ status: "accepted", invoice_id: null, value: 999, billable: false, billable_note: "Bad lead" }),
    ];
    const draft = buildInvoiceDraft(transfers);
    expect(draft!.transferCount).toBe(1);
    expect(draft!.totalAmount).toBe(50);
  });

  it("returns null when there is nothing to bill", () => {
    const transfers = [makeTransfer({ status: "pending" })];
    expect(buildInvoiceDraft(transfers)).toBeNull();
  });

  it("computes the period from the earliest and latest eligible dates", () => {
    const transfers = [
      makeTransfer({ status: "accepted", invoice_id: null, transfer_date: "2026-07-03" }),
      makeTransfer({ status: "accepted", invoice_id: null, transfer_date: "2026-07-01" }),
      makeTransfer({ status: "accepted", invoice_id: null, transfer_date: "2026-07-02" }),
    ];
    const draft = buildInvoiceDraft(transfers);
    expect(draft!.periodStart).toBe("2026-07-01");
    expect(draft!.periodEnd).toBe("2026-07-03");
  });

  it("rounds the total to two decimal places", () => {
    const transfers = [
      makeTransfer({ status: "accepted", invoice_id: null, value: 10.1 }),
      makeTransfer({ status: "accepted", invoice_id: null, value: 20.2 }),
    ];
    const draft = buildInvoiceDraft(transfers);
    expect(draft!.totalAmount).toBe(30.3);
  });
});

describe("formatInvoiceNumber", () => {
  it("formats as INV-YYYYMMDD-#### with zero padding", () => {
    expect(formatInvoiceNumber("2026-07-01", 7)).toBe("INV-20260701-0007");
    expect(formatInvoiceNumber("2026-07-01", 12345)).toBe("INV-20260701-12345");
  });
});
