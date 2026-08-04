import type { Transfer } from "./types";

/** Parse a plain YYYY-MM-DD string into a local Date at midnight (no TZ shift). */
export function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday-Sunday week range (inclusive) containing the given date. */
export function getWeekRange(dateStr: string): { start: string; end: string } {
  const date = parseISODate(dateStr);
  const day = date.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toISODate(monday), end: toISODate(sunday) };
}

export function getMonthRange(dateStr: string): { start: string; end: string } {
  const date = parseISODate(dateStr);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toISODate(first), end: toISODate(last) };
}

export interface ClientStats {
  dailyCount: number;
  dailyAccepted: number;
  dailyDeclined: number;
  dailyPending: number;
  dailyBillable: number;
  dailyRefund: number;
  dailyAwaitingBillingDecision: number;
  weeklyCount: number;
  monthlyCount: number;
  /** Sum of value for accepted-but-not-yet-invoiced transfers marked billable. */
  creditPending: number;
  monthlyBillableValue: number;
}

export function computeStats(
  transfers: Transfer[],
  referenceDateISO: string
): ClientStats {
  const week = getWeekRange(referenceDateISO);
  const month = getMonthRange(referenceDateISO);

  let dailyCount = 0;
  let dailyAccepted = 0;
  let dailyDeclined = 0;
  let dailyPending = 0;
  let dailyBillable = 0;
  let dailyRefund = 0;
  let dailyAwaitingBillingDecision = 0;
  let weeklyCount = 0;
  let monthlyCount = 0;
  let creditPending = 0;
  let monthlyBillableValue = 0;

  for (const t of transfers) {
    const isToday = t.transfer_date === referenceDateISO;
    const isThisWeek = t.transfer_date >= week.start && t.transfer_date <= week.end;
    const isThisMonth = t.transfer_date >= month.start && t.transfer_date <= month.end;

    if (isToday) {
      dailyCount++;
      if (t.status === "accepted") {
        dailyAccepted++;
        if (t.billing_status === "billable") dailyBillable++;
        else if (t.billing_status === "refund") dailyRefund++;
        else dailyAwaitingBillingDecision++;
      } else if (t.status === "declined") dailyDeclined++;
      else dailyPending++;
    }
    if (isThisWeek) weeklyCount++;
    if (isThisMonth) {
      monthlyCount++;
      if (t.billing_status === "billable") monthlyBillableValue += Number(t.value) || 0;
    }

    if (t.billing_status === "billable" && !t.invoice_id) {
      creditPending += Number(t.value) || 0;
    }
  }

  return {
    dailyCount,
    dailyAccepted,
    dailyDeclined,
    dailyPending,
    dailyBillable,
    dailyRefund,
    dailyAwaitingBillingDecision,
    weeklyCount,
    monthlyCount,
    creditPending,
    monthlyBillableValue,
  };
}

/** Admin-side rollup across every client's transfers for "today". */
export function computeAdminOverview(
  transfers: Transfer[],
  referenceDateISO: string
) {
  let totalToday = 0;
  let acceptedToday = 0;
  let pendingToday = 0;
  let declinedToday = 0;
  let billableToday = 0;
  let refundToday = 0;
  let totalCreditPending = 0;

  for (const t of transfers) {
    if (t.transfer_date === referenceDateISO) {
      totalToday++;
      if (t.status === "accepted") {
        acceptedToday++;
        if (t.billing_status === "billable") billableToday++;
        else if (t.billing_status === "refund") refundToday++;
      } else if (t.status === "declined") declinedToday++;
      else pendingToday++;
    }
    if (t.billing_status === "billable" && !t.invoice_id) {
      totalCreditPending += Number(t.value) || 0;
    }
  }

  return {
    totalToday,
    acceptedToday,
    pendingToday,
    declinedToday,
    billableToday,
    refundToday,
    totalCreditPending,
  };
}
