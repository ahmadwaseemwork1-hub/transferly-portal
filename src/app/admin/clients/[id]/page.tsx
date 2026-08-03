import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, Badge, StatCard } from "@/components/ui";
import { FilterableTransferTable } from "@/components/filterable-transfer-table";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { computeStats } from "@/lib/stats";
import { formatCurrency, todayISO, cn } from "@/lib/utils";
import type { Transfer } from "@/lib/types";
import {
  StatusToggle,
  ResetPasswordForm,
  GenerateInvoiceButton,
  ClientDetailsEditor,
  ArchiveClientControl,
} from "./client-actions";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: transfers }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase
      .from("transfers")
      .select("*")
      .eq("client_id", id)
      .order("transfer_date", { ascending: false }),
  ]);

  if (!client) notFound();

  const transferList = (transfers ?? []) as Transfer[];
  const stats = computeStats(transferList, todayISO());

  return (
    <div className="flex flex-col gap-6">
      <RealtimeRefresher tables={["transfers", "clients"]} />
      <Link
        href="/admin"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clients
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-semibold text-foreground">
              {client.business_name}
            </h1>
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
          <p className="mt-1 text-sm text-muted">
            {client.contact_name} · {client.email} · {client.phone}
          </p>
          {(client.state || client.requirements) && (
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted">
              {client.state && (
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-foreground">
                  📍 {client.state}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusToggle clientId={client.id} status={client.status} />
          <GenerateInvoiceButton clientId={client.id} disabled={stats.creditPending <= 0} />
          <ArchiveClientControl clientId={client.id} archivedAt={client.archived_at} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" value={stats.dailyCount} />
        <StatCard label="This week" value={stats.weeklyCount} />
        <StatCard label="This month" value={stats.monthlyCount} />
        <StatCard label="Credit pending" value={formatCurrency(stats.creditPending)} />
      </div>

      <Card>
        <CardHeader title="Client details" description="State, requirements, and notes for this client." />
        <div className="p-6">
          <ClientDetailsEditor
            clientId={client.id}
            initialState={client.state ?? ""}
            initialRequirements={client.requirements ?? ""}
            initialNotes={client.notes ?? ""}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Reset login password" />
        <div className="p-6">
          <ResetPasswordForm clientId={client.id} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Transfer history" description="Search by lead name, filter by status or date range." />
        <FilterableTransferTable transfers={transferList} showBillable adminDeletable />
      </Card>
    </div>
  );
}
