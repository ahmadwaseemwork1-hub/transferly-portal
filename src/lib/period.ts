import { parseISODate } from "./stats";

export type PeriodKey = "today" | "week" | "month" | "6months" | "year";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  "6months": "Last 6 months",
  year: "This year",
};

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Returns an inclusive [start, end] date range for the given period key. */
export function getPeriodRange(period: PeriodKey, referenceDateISO: string): {
  start: string;
  end: string;
} {
  const ref = parseISODate(referenceDateISO);

  switch (period) {
    case "today":
      return { start: referenceDateISO, end: referenceDateISO };
    case "week": {
      const day = ref.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      const monday = new Date(ref);
      monday.setDate(ref.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: toISODate(monday), end: toISODate(sunday) };
    }
    case "month": {
      const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
      return { start: toISODate(first), end: toISODate(last) };
    }
    case "6months": {
      const start = new Date(ref.getFullYear(), ref.getMonth() - 5, 1);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
      return { start: toISODate(start), end: toISODate(end) };
    }
    case "year": {
      const start = new Date(ref.getFullYear(), 0, 1);
      const end = new Date(ref.getFullYear(), 11, 31);
      return { start: toISODate(start), end: toISODate(end) };
    }
  }
}

export function isWithinRange(dateISO: string, range: { start: string; end: string }): boolean {
  return dateISO >= range.start && dateISO <= range.end;
}
