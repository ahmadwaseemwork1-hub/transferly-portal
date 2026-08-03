import type { Transfer } from "./types";

export interface InvoiceDraft {
  transferIds: string[];
  totalAmount: number;
  transferCount: number;
  periodStart: string;
  periodEnd: string;
}

/**
 * Builds an invoice draft from a client's accepted-but-not-yet-invoiced
 * transfers. Only transfers with status "accepted", no invoice_id, and
 * billable !== false are eligible — this is what "credit pending" means
 * throughout the app. Transfers the client has flagged non-billable are
 * excluded until they're switched back.
 */
export function buildInvoiceDraft(transfers: Transfer[]): InvoiceDraft | null {
  const eligible = transfers.filter((t) => t.status === "accepted" && !t.invoice_id && t.billable !== false);
  if (eligible.length === 0) return null;

  const dates = eligible.map((t) => t.transfer_date).sort();
  const totalAmount = eligible.reduce((sum, t) => sum + (Number(t.value) || 0), 0);

  return {
    transferIds: eligible.map((t) => t.id),
    totalAmount: Math.round(totalAmount * 100) / 100,
    transferCount: eligible.length,
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
  };
}

/** e.g. INV-20260701-0007 */
export function formatInvoiceNumber(dateISO: string, sequence: number): string {
  const compact = dateISO.replace(/-/g, "");
  return `INV-${compact}-${String(sequence).padStart(4, "0")}`;
}
