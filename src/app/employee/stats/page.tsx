import { requireEmployee } from "@/lib/auth";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { computeStats } from "@/lib/stats";
import { todayISO } from "@/lib/utils";
import type { Transfer } from "@/lib/types";

export default async function EmployeeStatsPage() {
  const { supabase, profile } = await requireEmployee();
  const today = todayISO();

  const { data: transfers } = await supabase
    .from("transfers")
    .select("*")
    .eq("submitted_by", profile.employee_id!);

  const transferList = (transfers ?? []) as Transfer[];
  const stats = computeStats(transferList, today);
  const approvedToday = transferList.filter(
    (t) => t.transfer_date === today && t.employee_approved
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Your stats</h1>
        <p className="mt-1 text-sm text-muted">Submission volume over time.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Submitted today" value={stats.dailyCount} />
        <StatCard label="Submitted this week" value={stats.weeklyCount} />
        <StatCard label="Submitted this month" value={stats.monthlyCount} />
      </div>

      <Card>
        <CardHeader title="Today's breakdown" />
        <div className="grid grid-cols-3 gap-4 p-6 text-center">
          <div>
            <p className="text-2xl font-semibold text-success">{approvedToday}</p>
            <p className="text-sm text-muted">Approved</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-warning">
              {stats.dailyCount - approvedToday}
            </p>
            <p className="text-sm text-muted">Awaiting approval</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{stats.dailyCount}</p>
            <p className="text-sm text-muted">Total submitted</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
