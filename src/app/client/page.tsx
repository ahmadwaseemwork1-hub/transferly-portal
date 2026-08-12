import { requireClient } from "@/lib/auth";
import { Card, StatCard, EmptyState } from "@/components/ui";
import { PendingTransferCard, AwaitingBillingCard, CampaignToggle } from "./transfer-actions";
import { computeStats } from "@/lib/stats";
import { formatCurrency, todayISO } from "@/lib/utils";
import type { Client, Transfer } from "@/lib/types";

export default async function ClientDashboardPage() {
  const { supabase, profile } = await requireClient();
  const today = todayISO();

  const [{ data: transfers }, { data: clientRow }] = await Promise.all([
    supabase
      .from("transfers")
      .select("*")
      .eq("client_id", profile.client_id!)
      .order("transfer_date", { ascending: false }),
    supabase.from("clients").select("*").eq("id", profile.client_id!).maybeSingle(),
  ]);

  const transferList = (transfers ?? []) as Transfer[];
  const client = clientRow as Client | null;
  const pending = transferList.filter((t) => t.status === "pending");
  // Once you mark a transfer billable or refund, it moves off the dashboard
  // and into History — same pattern as "Needs your response" above, where a
  // transfer disappears from view once you've acted on it.
  const awaitingBilling = transferList.filter(
    (t) => t.status === "accepted" && !t.invoice_id && !t.billing_status
  );
  const stats = computeStats(transferList, today);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Review and respond to your live transfers. New leads appear here instantly.
          </p>
        </div>
        {client && <CampaignToggle campaignStatus={client.campaign_status} />}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" value={stats.dailyCount} />
        <StatCard label="This week" value={stats.weeklyCount} />
        <StatCard label="This month" value={stats.monthlyCount} />
        <StatCard label="Credit pending (billable)" value={formatCurrency(stats.creditPending)} />
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

      {awaitingBilling.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            Accepted — needs a billing decision ({awaitingBilling.length})
          </h2>
          <div className="flex flex-col gap-3">
            {awaitingBilling.map((t) => (
              <AwaitingBillingCard key={t.id} transfer={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
