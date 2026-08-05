import Link from "next/link";
import { requireEmployee } from "@/lib/auth";
import { Card, CardHeader, StatCard, Button, EmptyState } from "@/components/ui";
import { TransferTable } from "@/components/transfer-table";
import { computeStats } from "@/lib/stats";
import { todayISO } from "@/lib/utils";
import type { Transfer } from "@/lib/types";

export default async function EmployeeDashboardPage() {
  const { supabase, profile } = await requireEmployee();
  const today = todayISO();

  // Never select `value` here — employees only ever see their own PKR pay
  // (on the "My pay" page), never the client's dollar value. Every other
  // lead-detail field is fine to show in full.
  const { data: transfers } = await supabase
    .from("transfers")
    .select(
      "id, client_id, transfer_date, transfer_time, lead_name, phone, email, state, insurance_type, status, decline_reason, billing_status, billing_note, employee_approved, date_of_birth, address, city, zip_code, home_status, vehicle_count, vehicles, current_carrier, policy_term, lead_extra"
    )
    .eq("submitted_by", profile.employee_id!)
    .order("created_at", { ascending: false });

  const transferList = (transfers ?? []) as Transfer[];
  const stats = computeStats(transferList, today);
  const pendingApproval = transferList.filter((t) => !t.employee_approved);
  const recent = transferList.slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Your submissions and approval status.</p>
        </div>
        <Link href="/employee/submit">
          <Button>Submit a lead</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" value={stats.dailyCount} />
        <StatCard label="This week" value={stats.weeklyCount} />
        <StatCard label="This month" value={stats.monthlyCount} />
        <StatCard label="Awaiting approval" value={pendingApproval.length} />
      </div>

      <Card>
        <CardHeader title="Recent submissions" />
        {recent.length === 0 ? (
          <EmptyState
            title="Nothing submitted yet"
            description="Use Submit Lead to enter your first transfer."
          />
        ) : (
          <TransferTable transfers={recent} showApproval hideValue />
        )}
      </Card>
    </div>
  );
}
