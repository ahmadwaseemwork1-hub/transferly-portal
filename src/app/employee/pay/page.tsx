import Link from "next/link";
import { requireEmployee } from "@/lib/auth";
import { Card, CardHeader, StatCard, EmptyState } from "@/components/ui";
import { computeEmployeePayroll } from "@/lib/payroll";
import { getPeriodRange, PERIOD_LABELS, type PeriodKey } from "@/lib/period";
import { todayISO, cn, formatDate } from "@/lib/utils";
import type { Transfer } from "@/lib/types";

const PERIODS: PeriodKey[] = ["today", "week", "month", "6months", "year"];

export default async function EmployeePayPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period: PeriodKey = PERIODS.includes(periodParam as PeriodKey)
    ? (periodParam as PeriodKey)
    : "week";
  const range = getPeriodRange(period, todayISO());

  const { supabase, profile } = await requireEmployee();

  const { data: employee } = await supabase
    .from("employees")
    .select("base_rate_pkr, bonus_tiers")
    .eq("id", profile.employee_id!)
    .single();

  const { data: transfers } = await supabase
    .from("transfers")
    .select("*")
    .eq("submitted_by", profile.employee_id!)
    .gte("transfer_date", range.start)
    .lte("transfer_date", range.end);

  const payroll = computeEmployeePayroll(
    employee?.base_rate_pkr ?? 0,
    employee?.bonus_tiers ?? [],
    (transfers ?? []) as Transfer[]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">My pay</h1>
        <p className="mt-1 text-sm text-muted">
          Based on your approved submissions and your current pay rules.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/employee/pay?period=${p}`}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              p === period
                ? "bg-primary text-primary-foreground"
                : "bg-primary-soft text-primary hover:bg-primary/10"
            )}
          >
            {PERIOD_LABELS[p]}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total pay" value={`${payroll.totalPkr.toLocaleString()} PKR`} />
        <StatCard label="Approved transfers" value={payroll.totalTransfers} />
        <StatCard label="Days worked" value={payroll.byDate.length} />
      </div>

      <Card>
        <CardHeader
          title={`Daily breakdown — ${PERIOD_LABELS[period]}`}
          description={`${range.start} to ${range.end}`}
        />
        {payroll.byDate.length === 0 ? (
          <EmptyState
            title="Nothing approved yet for this period"
            description="Pay appears here once your admin approves your submissions."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Approved transfers</th>
                  <th className="px-4 py-3 font-medium">Pay</th>
                </tr>
              </thead>
              <tbody>
                {payroll.byDate.map((entry) => (
                  <tr key={entry.date} className="border-b border-border last:border-0">
                    <td className="px-6 py-3 text-foreground">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3 text-foreground">{entry.transferCount}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {entry.amountPkr.toLocaleString()} PKR
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
