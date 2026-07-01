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
  weeklyCount: number;
  monthlyCount: number;
  creditPending: number;
  monthlyAcceptedValue: number;
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
  let weeklyCount = 0;
  let monthlyCount = 0;
  let creditPending = 0;
  let monthlyAcceptedValue = 0;

  for (const t of transfers) {
    const isToday = t.transfer_date === referenceDateISO;
    const isThisWeek = t.transfer_date >= week.start && t.transfer_date <= week.end;
    const isThisMonth = t.transfer_date >= month.start && t.transfer_date <= month.end;

    if (isToday) {
      dailyCount++;
      if (t.status === "accepted") dailyAccepted++;
      else if (t.status === "declined") dailyDeclined++;
      else dailyPending++;
    }
    if (isThisWeek) weeklyCount++;
    if (isThisMonth) {
      monthlyCount++;
      if (t.status === "accepted") monthlyAcceptedValue += Number(t.value) || 0;
    }

    if (t.status === "accepted" && !t.invoice_id) {
      creditPending += Number(t.value) || 0;
    }
  }

  return {
    dailyCount,
    dailyAccepted,
    dailyDeclined,
    dailyPending,
    weeklyCount,
    monthlyCount,
    creditPending,
    monthlyAcceptedValue,
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
  let totalCreditPending = 0;

  for (const t of transfers) {
    if (t.transfer_date === referenceDateISO) {
      totalToday++;
      if (t.status === "accepted") acceptedToday++;
      else if (t.status === "declined") declinedToday++;
      else pendingToday++;
    }
    if (t.status === "accepted" && !t.invoice_id) {
      totalCreditPending += Number(t.value) || 0;
    }
  }

  return { totalToday, acceptedToday, pendingToday, declinedToday, totalCreditPending };
}
