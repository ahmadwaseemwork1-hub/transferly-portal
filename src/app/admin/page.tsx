import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { computeStats } from "@/lib/stats";
import { formatCurrency, todayISO, cn } from "@/lib/utils";
import type { Client, Transfer } from "@/lib/types";
import { Plus } from "lucide-react";
import { RealtimeDuplicateAlerts } from "@/components/realtime-duplicate-alerts";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Campaign active" },
  { value: "paused", label: "Campaign paused" },
] as const;

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { campaign } = await searchParams;
  const filter = campaign === "active" || campaign === "paused" ? campaign : "all";

  const supabase = await createClient();
  const today = todayISO();

  const [{ data: clients }, { data: transfers }, { data: employees }, { count: archivedCount }] =
    await Promise.all([
      supabase.from("clients").select("*").is("archived_at", null).order("business_name"),
      supabase.from("transfers").select("*"),
      supabase.from("employees").select("id, full_name"),
      supabase.from("clients").select("id", { count: "exact", head: true }).not("archived_at", "is", null),
    ]);

  const clientList = (clients ?? []) as Client[];
  const transferList = (transfers ?? []) as Transfer[];
  const employeeNames = Object.fromEntries((employees ?? []).map((e) => [e.id, e.full_name]));
  const clientNames = Object.fromEntries(clientList.map((c) => [c.id, c.business_name]));

  const visibleClients =
    filter === "all" ? clientList : clientList.filter((c) => c.campaign_status === filter);

  return (
    <div className="flex flex-col gap-6">
      <RealtimeDuplicateAlerts employeeNames={employeeNames} clientNames={clientNames} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted">
            Every client you manage, and how they&apos;re tracking.
            {archivedCount ? ` ${archivedCount} archived.` : ""}
          </p>
        </div>
        <Link href="/admin/clients/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add client
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/admin" : `/admin?campaign=${f.value}`}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-primary-soft text-primary hover:bg-primary/10"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {visibleClients.length === 0 ? (
        <Card>
          <EmptyState
            title={clientList.length === 0 ? "No clients yet" : "No clients match this filter"}
            description={
              clientList.length === 0
                ? "Add your first client to start sending them live transfers."
                : "Try a different campaign filter."
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleClients.map((client) => {
            const clientTransfers = transferList.filter((t) => t.client_id === client.id);
            const stats = computeStats(clientTransfers, today);
            const todayCount = clientTransfers.filter((t) => t.transfer_date === today).length;
            const capLabel =
              client.daily_cap != null ? `${todayCount} of ${client.daily_cap} today` : null;
            return (
              <Link key={client.id} href={`/admin/clients/${client.id}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{client.business_name}</p>
                      <p className="text-sm text-muted">{client.contact_name ?? client.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        className={cn(
                          client.status === "active"
                            ? "bg-success-soft text-success"
                            : "bg-neutral-100 text-muted"
                        )}
                      >
                        {client.status}
                      </Badge>
                      <Badge
                        className={cn(
                          client.campaign_status === "active"
                            ? "bg-primary-soft text-primary"
                            : "bg-neutral-100 text-muted"
                        )}
                      >
                        Campaign {client.campaign_status}
                      </Badge>
                    </div>
                  </div>
                  {capLabel && <p className="mt-2 text-xs text-muted">Cap: {capLabel}</p>}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{stats.dailyCount}</p>
                      <p className="text-xs text-muted">Today</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{stats.weeklyCount}</p>
                      <p className="text-xs text-muted">This week</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{stats.monthlyCount}</p>
                      <p className="text-xs text-muted">This month</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-accent-soft px-3 py-2">
                    <span className="text-xs font-medium text-accent">Credit pending</span>
                    <span className="text-sm font-semibold text-accent">
                      {formatCurrency(stats.creditPending)}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
