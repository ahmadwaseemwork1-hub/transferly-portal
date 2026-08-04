import type { BonusTier, Transfer } from "./types";

/**
 * Daily pay for one employee given their confirmed rule:
 * below the lowest tier threshold, pay is base_rate x count. At or above a
 * threshold, pay becomes a FLAT amount for the day — it replaces the
 * per-transfer math rather than adding to it. The highest threshold met
 * wins (a tier list of [{5, 3000}, {10, 7000}] means 10 transfers pays
 * 7000 flat, not 3000 + 7000).
 *
 * This is intentionally not required to be monotonic — if tiers are set up
 * so that hitting one nets less than stopping just below it, that's a
 * property of the configured tiers, not a bug in this function. Surface
 * that risk in the UI, don't silently "fix" it here.
 */
export function computeDailyPay(
  baseRatePkr: number,
  bonusTiers: BonusTier[],
  transferCount: number
): number {
  if (transferCount <= 0) return 0;

  const sorted = [...bonusTiers].sort((a, b) => b.min_transfers - a.min_transfers);
  const matchedTier = sorted.find((tier) => transferCount >= tier.min_transfers);

  if (matchedTier) return matchedTier.flat_amount;
  return baseRatePkr * transferCount;
}

export interface DailyPayrollEntry {
  date: string;
  transferCount: number;
  amountPkr: number;
}

export interface PayrollSummary {
  totalPkr: number;
  totalTransfers: number;
  byDate: DailyPayrollEntry[];
}

/**
 * Groups this employee's approved, submitted transfers by day and applies
 * the tier rule per day (payroll tiers are daily, not summed across the
 * whole period) — only transfers with employee_approved = true count,
 * matching the approval-gates-payroll-credit workflow.
 */
export function computeEmployeePayroll(
  baseRatePkr: number,
  bonusTiers: BonusTier[],
  transfers: Transfer[]
): PayrollSummary {
  const countsByDate = new Map<string, number>();

  for (const t of transfers) {
    if (!t.employee_approved) continue;
    countsByDate.set(t.transfer_date, (countsByDate.get(t.transfer_date) ?? 0) + 1);
  }

  const byDate: DailyPayrollEntry[] = Array.from(countsByDate.entries())
    .map(([date, transferCount]) => ({
      date,
      transferCount,
      amountPkr: computeDailyPay(baseRatePkr, bonusTiers, transferCount),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const totalPkr = byDate.reduce((sum, entry) => sum + entry.amountPkr, 0);
  const totalTransfers = byDate.reduce((sum, entry) => sum + entry.transferCount, 0);

  return { totalPkr, totalTransfers, byDate };
}
