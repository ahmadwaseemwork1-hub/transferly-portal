import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { TransferTable } from "@/components/transfer-table";
import { computeAdminOverview } from "@/lib/stats";
import { formatCurrency, todayISO } from "@/lib/utils";
import type { Client, Transfer } from "@/lib/types";

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const today = todayISO();

  const [{ data: clients }, { data: transfers }] = await Promise.all([
    supabase.from("clients").select("id, business_name"),
    supabase
      .from("transfers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const clientList = (clients ?? []) as Pick<Client, "id" | "business_name">[];
  const transferList = (transfers ?? []) as Transfer[];
  const overview = computeAdminOverview(transferList, today);

  const clientNames = Object.fromEntries(clientList.map((c) => [c.id, c.business_name]));
  const recent = transferList.slice(0, 15);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">My progress</h1>
        <p className="mt-1 text-sm text-muted">
          Everything happening across every client, today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Transfers today" value={overview.totalToday} />
        <StatCard label="Accepted today" value={overview.acceptedToday} />
        <StatCard label="Pending today" value={overview.pendingToday} />
        <StatCard
          label="Total credit pending"
          value={formatCurrency(overview.totalCreditPending)}
          hint="Across all clients, not yet invoiced"
        />
      </div>

      <Card>
        <CardHeader title="Recent activity" description="Latest transfers across all clients." />
        <TransferTable transfers={recent} showClient clientNames={clientNames} />
      </Card>
    </div>
  );
}
