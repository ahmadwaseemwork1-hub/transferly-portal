import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Button, EmptyState, HeroBanner } from "@/components/ui";
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
  const activeCount = clientList.filter(c => c.status === "active").length;

  return (
    <div className="flex flex-col gap-6">
      <HeroBanner
        title="Clients"
        subtitle={`${activeCount} active client${activeCount !== 1 ? "s" : ""} · ${clientList.length} total`}
        badge="CRM"
        action={
          <Link href="/admin/clients/new">
            <Button variant="outline" size="sm" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
              <Plus className="h-4 w-4" />
              Add client
            </Button>
          </Link>
        }
      />

      {clientList.length === 0 ? (
        <Card>
          <EmptyState
            title="No clients yet"
            description="Add your first client to start sending them live transfers."
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clientList.map((client) => {
            const clientTransfers = transferList.filter((t) => t.client_id === client.id);
            const stats = computeStats(clientTransfers, today);
            return (
              <Link key={client.id} href={`/admin/clients/${client.id}`}>
                <Card className="h-full p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-sm">
                        {client.business_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground leading-tight">{client.business_name}</p>
                        <p className="text-xs text-muted mt-0.5">{client.contact_name ?? client.email}</p>
                      </div>
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
                    <div className="rounded-lg bg-background p-2">
                      <p className="text-lg font-bold text-foreground">{stats.dailyCount}</p>
                      <p className="text-xs text-muted">Today</p>
                    </div>
                    <div className="rounded-lg bg-background p-2">
                      <p className="text-lg font-bold text-foreground">{stats.weeklyCount}</p>
                      <p className="text-xs text-muted">Week</p>
                    </div>
                    <div className="rounded-lg bg-background p-2">
                      <p className="text-lg font-bold text-foreground">{stats.monthlyCount}</p>
                      <p className="text-xs text-muted">Month</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-accent-soft px-3 py-2">
                    <span className="text-xs font-medium text-accent">Credit pending</span>
                    <span className="text-sm font-bold text-accent">
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
