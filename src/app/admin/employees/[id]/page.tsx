import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, Badge, StatCard } from "@/components/ui";
import { TransferTable } from "@/components/transfer-table";
import { computeStats } from "@/lib/stats";
import { todayISO, cn } from "@/lib/utils";
import type { Transfer, Client } from "@/lib/types";
import {
  StatusToggle,
  ResetPasswordForm,
  PayRulesForm,
  ClientAssignments,
  ArchiveEmployeeControl,
} from "./employee-actions";

const EMPLOYMENT_LABELS: Record<string, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
  part_time: "Part-time",
};

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: employee },
    { data: transfers },
    { data: clients },
    { data: assignments },
  ] = await Promise.all([
    supabase.from("employees").select("*").eq("id", id).single(),
    supabase
      .from("transfers")
      .select("*")
      .eq("submitted_by", id)
      .order("transfer_date", { ascending: false }),
    supabase.from("clients").select("id, business_name").eq("status", "active").order("business_name"),
    supabase.from("employee_client_assignments").select("client_id").eq("employee_id", id),
  ]);

  if (!employee) notFound();

  const transferList = (transfers ?? []) as Transfer[];
  const stats = computeStats(transferList, todayISO());
  const approvedCount = transferList.filter((t) => t.employee_approved).length;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/employees"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to employees
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-semibold text-foreground">
              {employee.full_name}
            </h1>
            <Badge
              className={cn(
                employee.status === "active"
                  ? "bg-success-soft text-success"
                  : "bg-neutral-100 text-muted"
              )}
            >
              {employee.status}
            </Badge>
            <Badge className="bg-primary-soft text-primary">
              {EMPLOYMENT_LABELS[employee.employment_type]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {employee.email} · {employee.phone}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusToggle employeeId={employee.id} status={employee.status} />
          <ArchiveEmployeeControl employeeId={employee.id} archivedAt={employee.archived_at} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Submitted today" value={stats.dailyCount} />
        <StatCard label="This week" value={stats.weeklyCount} />
        <StatCard label="This month" value={stats.monthlyCount} />
        <StatCard label="Total approved" value={approvedCount} />
      </div>

      <Card>
        <CardHeader title="Assigned clients" description="Which clients this employee works." />
        <div className="p-6">
          <ClientAssignments
            employeeId={employee.id}
            allClients={(clients ?? []) as Pick<Client, "id" | "business_name">[]}
            assignedClientIds={(assignments ?? []).map((a) => a.client_id)}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Pay rules" description="Editable any time — takes effect immediately." />
        <div className="p-6">
          <PayRulesForm
            employeeId={employee.id}
            initialRate={employee.base_rate_pkr}
            initialTiers={employee.bonus_tiers ?? []}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Reset login password" />
        <div className="p-6">
          <ResetPasswordForm employeeId={employee.id} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Submitted transfers" description="Everything this employee has entered." />
        <TransferTable transfers={transferList} showApproval />
      </Card>
    </div>
  );
}
