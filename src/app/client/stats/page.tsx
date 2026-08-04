import { requireClient } from "@/lib/auth";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { computeStats } from "@/lib/stats";
import { formatCurrency, todayISO } from "@/lib/utils";
import type { Transfer } from "@/lib/types";

export default async function ClientStatsPage() {
  const { supabase, profile } = await requireClient();
  const today = todayISO();

  const { data: transfers } = await supabase
    .from("transfers")
    .select("*")
    .eq("client_id", profile.client_id!);

  const transferList = (transfers ?? []) as Transfer[];
  const stats = computeStats(transferList, today);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Your stats</h1>
        <p className="mt-1 text-sm text-muted">A running view of your transfer activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Transfers today" value={stats.dailyCount} />
        <StatCard label="Transfers this week" value={stats.weeklyCount} />
        <StatCard label="Transfers this month" value={stats.monthlyCount} />
      </div>

      <Card>
        <CardHeader title="Today's breakdown" />
        <div className="grid grid-cols-2 gap-4 p-6 text-center sm:grid-cols-5">
          <div>
            <p className="text-2xl font-semibold text-success">{stats.dailyAccepted}</p>
            <p className="text-sm text-muted">Accepted</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-warning">{stats.dailyPending}</p>
            <p className="text-sm text-muted">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-danger">{stats.dailyDeclined}</p>
            <p className="text-sm text-muted">Declined</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-success">{stats.dailyBillable}</p>
            <p className="text-sm text-muted">Billable</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-danger">{stats.dailyRefund}</p>
            <p className="text-sm text-muted">Refund</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Billing" />
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted">Credit pending (billable, not yet invoiced)</p>
            <p className="mt-1 text-2xl font-semibold text-accent">
              {formatCurrency(stats.creditPending)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Billable value this month</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {formatCurrency(stats.monthlyBillableValue)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
