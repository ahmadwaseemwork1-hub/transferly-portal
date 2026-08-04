import { requireEmployee } from "@/lib/auth";
import { Card, Badge, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types";
import Link from "next/link";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Campaign active" },
  { value: "paused", label: "Campaign paused" },
] as const;

export default async function EmployeeClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { campaign } = await searchParams;
  const filter = campaign === "active" || campaign === "paused" ? campaign : "all";

  const { supabase, profile } = await requireEmployee();

  const { data: assignments } = await supabase
    .from("employee_client_assignments")
    .select("client_id")
    .eq("employee_id", profile.employee_id!);

  const clientIds = (assignments ?? []).map((a) => a.client_id);

  const { data: clients } =
    clientIds.length > 0
      ? await supabase.from("clients").select("*").in("id", clientIds).order("business_name")
      : { data: [] as Client[] };

  const clientList = (clients ?? []) as Client[];
  const visibleClients =
    filter === "all" ? clientList : clientList.filter((c) => c.campaign_status === filter);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">My clients</h1>
        <p className="mt-1 text-sm text-muted">
          The clients assigned to you, and whether they're currently taking calls.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/employee/clients" : `/employee/clients?campaign=${f.value}`}
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
            title={clientList.length === 0 ? "No clients assigned yet" : "No clients match this filter"}
            description={
              clientList.length === 0
                ? "Ask an admin to assign a client to you."
                : "Try a different campaign filter."
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleClients.map((client) => (
            <Card key={client.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{client.business_name}</p>
                  <p className="text-sm text-muted">{client.contact_name ?? client.email}</p>
                </div>
                <Badge
                  className={cn(
                    client.campaign_status === "active"
                      ? "bg-success-soft text-success"
                      : "bg-neutral-100 text-muted"
                  )}
                >
                  {client.campaign_status === "active" ? "Taking calls" : "Paused"}
                </Badge>
              </div>
              <dl className="mt-4 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Phone</dt>
                  <dd className="text-foreground">{client.phone ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Rate / transfer</dt>
                  <dd className="text-foreground">
                    {client.price_per_transfer != null ? `$${client.price_per_transfer}` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Schedule</dt>
                  <dd className="text-foreground">
                    {client.schedule_from && client.schedule_to
                      ? `${client.schedule_from} – ${client.schedule_to}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Daily cap</dt>
                  <dd className="text-foreground">{client.daily_cap ?? "No limit"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Accepted states</dt>
                  <dd className="text-foreground">{client.accepted_states ?? "—"}</dd>
                </div>
                {client.notes && (
                  <div className="mt-1 border-t border-border pt-2">
                    <dt className="text-xs text-muted">Notes</dt>
                    <dd className="text-foreground">{client.notes}</dd>
                  </div>
                )}
              </dl>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
