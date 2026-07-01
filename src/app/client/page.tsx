import { requireClient } from "@/lib/auth";
import { Card, StatCard, EmptyState } from "@/components/ui";
import { PendingTransferCard } from "./transfer-actions";
import { computeStats } from "@/lib/stats";
import { formatCurrency, todayISO } from "@/lib/utils";
import type { Transfer } from "@/lib/types";

export default async function ClientDashboardPage() {
  const { supabase, profile } = await requireClient();
  const today = todayISO();

  const { data: transfers } = await supabase
    .from("transfers")
    .select("*")
    .eq("client_id", profile.client_id!)
    .order("transfer_date", { ascending: false });

  const transferList = (transfers ?? []) as Transfer[];
  const pending = transferList.filter((t) => t.status === "pending");
  const stats = computeStats(transferList, today);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Review and respond to your live transfers.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" value={stats.dailyCount} />
        <StatCard label="This week" value={stats.weeklyCount} />
        <StatCard label="This month" value={stats.monthlyCount} />
        <StatCard label="Credit pending" value={formatCurrency(stats.creditPending)} />
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Needs your response {pending.length > 0 && `(${pending.length})`}
        </h2>
        {pending.length === 0 ? (
          <Card>
            <EmptyState
              title="You're all caught up"
              description="New transfers will show up here as soon as they're sent."
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((t) => (
              <PendingTransferCard key={t.id} transfer={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
