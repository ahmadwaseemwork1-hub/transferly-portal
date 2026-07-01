import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { computeStats } from "@/lib/stats";
import { formatCurrency, todayISO, cn } from "@/lib/utils";
import type { Client, Transfer } from "@/lib/types";
import { Plus } from "lucide-react";

export default async function AdminClientsPage() {
  const supabase = await createClient();
  const today = todayISO();

  const [{ data: clients }, { data: transfers }] = await Promise.all([
    supabase.from("clients").select("*").order("business_name"),
    supabase.from("transfers").select("*"),
  ]);

  const clientList = (clients ?? []) as Client[];
  const transferList = (transfers ?? []) as Transfer[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted">
            Every client you manage, and how they&apos;re tracking.
          </p>
        </div>
        <Link href="/admin/clients/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add client
          </Button>
        </Link>
      </div>

      {clientList.length === 0 ? (
        <Card>
          <EmptyState
            title="No clients yet"
            description="Add your first client to start sending them live transfers."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clientList.map((client) => {
            const clientTransfers = transferList.filter((t) => t.client_id === client.id);
            const stats = computeStats(clientTransfers, today);
            return (
              <Link key={client.id} href={`/admin/clients/${client.id}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{client.business_name}</p>
                      <p className="text-sm text-muted">{client.contact_name ?? client.email}</p>
                    </div>
                    <Badge
                      className={cn(
                        client.status === "active"
                          ? "bg-success-soft text-success"
                          : "bg-neutral-100 text-muted"
                      )}
                    >
                      {client.status}
                    </Badge>
                  </div>
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
