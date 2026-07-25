import { requireClient } from "@/lib/auth";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { computeStats } from "@/lib/stats";
import { formatCurrency, formatCurrencyPKR, todayISO } from "@/lib/utils";
import { getPkrRate } from "@/lib/pkr-rate";
import type { Transfer } from "@/lib/types";

export default async function ClientStatsPage() {
  const { supabase, profile } = await requireClient();
  const today = todayISO();

  const [{ data: transfers }, pkrRate] = await Promise.all([
    supabase
      .from("transfers")
      .select("*")
      .eq("client_id", profile.client_id!),
    getPkrRate(),
  ]);

  const transferList = (transfers ?? []) as Transfer[];
  const stats = computeStats(transferList, today);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Your stats</h1>
          <p className="mt-1 text-sm text-muted">A running view of your transfer activity.</p>
        </div>
        <p className="text-xs text-muted">
          USD/PKR: <span className="font-medium text-foreground">₨ {pkrRate.toFixed(2)}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Transfers today" value={stats.dailyCount} />
        <StatCard label="Transfers this week" value={stats.weeklyCount} />
        <StatCard label="Transfers this month" value={stats.monthlyCount} />
      </div>

      <Card>
        <CardHeader title="Today's breakdown" />
        <div className="grid grid-cols-3 gap-4 p-6 text-center">
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
        </div>
      </Card>

      <Card>
        <CardHeader title="Billing" />
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted">Credit pending (accepted, not yet invoiced)</p>
            <p className="mt-1 text-2xl font-semibold text-accent">
              {formatCurrency(stats.creditPending)}
            </p>
            <p className="mt-0.5 text-sm font-medium text-muted">
              ≈ {formatCurrencyPKR(stats.creditPending, pkrRate)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Accepted value this month</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {formatCurrency(stats.monthlyAcceptedValue)}
            </p>
            <p className="mt-0.5 text-sm font-medium text-muted">
              ≈ {formatCurrencyPKR(stats.monthlyAcceptedValue, pkrRate)}
            </p>
          </div>
        </div>
      </Card>

      {/* PKR / USD Rate Card */}
      <Card>
        <CardHeader
          title="PKR / USD Exchange Rate"
          description="Live rate used to convert your USD transfer values."
        />
        <div className="flex items-center gap-6 p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Current rate</p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              ₨ {pkrRate.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs text-muted">per 1 USD · updates every hour</p>
          </div>
          <div className="h-12 w-px bg-border" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Your $1 transfer =
            </p>
            <p className="mt-1 text-xl font-semibold text-accent">
              ₨ {pkrRate.toFixed(0)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
