import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, StatCard, EmptyState } from "@/components/ui";
import { computeEmployeePayroll } from "@/lib/payroll";
import { getPeriodRange, PERIOD_LABELS, type PeriodKey } from "@/lib/period";
import { todayISO, cn } from "@/lib/utils";
import type { Employee, Transfer } from "@/lib/types";

const PERIODS: PeriodKey[] = ["today", "week", "month", "6months", "year"];

export default async function AdminPayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period: PeriodKey = PERIODS.includes(periodParam as PeriodKey)
    ? (periodParam as PeriodKey)
    : "today";
  const range = getPeriodRange(period, todayISO());

  const supabase = await createClient();
  const [{ data: employees }, { data: transfers }] = await Promise.all([
    supabase.from("employees").select("*").order("full_name"),
    supabase
      .from("transfers")
      .select("*")
      .gte("transfer_date", range.start)
      .lte("transfer_date", range.end)
      .eq("employee_approved", true)
      .not("submitted_by", "is", null),
  ]);

  const employeeList = (employees ?? []) as Employee[];
  const transferList = (transfers ?? []) as Transfer[];

  const rows = employeeList.map((employee) => {
    const theirTransfers = transferList.filter((t) => t.submitted_by === employee.id);
    const payroll = computeEmployeePayroll(
      employee.base_rate_pkr,
      employee.bonus_tiers ?? [],
      theirTransfers
    );
    return { employee, payroll };
  });

  const companyTotalPkr = rows.reduce((sum, r) => sum + r.payroll.totalPkr, 0);
  const companyTotalTransfers = rows.reduce((sum, r) => sum + r.payroll.totalTransfers, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Payroll</h1>
        <p className="mt-1 text-sm text-muted">
          Computed from each employee's approved submissions and their pay rules.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/admin/payroll?period=${p}`}
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total payroll" value={`${companyTotalPkr.toLocaleString()} PKR`} />
        <StatCard label="Approved transfers" value={companyTotalTransfers} />
        <StatCard label="Employees" value={employeeList.length} />
      </div>

      <Card>
        <CardHeader
          title={`Breakdown — ${PERIOD_LABELS[period]}`}
          description={`${range.start} to ${range.end}`}
        />
        {rows.length === 0 ? (
          <EmptyState title="No employees yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-6 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Approved transfers</th>
                  <th className="px-4 py-3 font-medium">Days worked</th>
                  <th className="px-4 py-3 font-medium">Total pay</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ employee, payroll }) => (
                  <tr key={employee.id} className="border-b border-border last:border-0">
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/employees/${employee.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {employee.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">{payroll.totalTransfers}</td>
                    <td className="px-4 py-3 text-foreground">{payroll.byDate.length}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {payroll.totalPkr.toLocaleString()} PKR
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
