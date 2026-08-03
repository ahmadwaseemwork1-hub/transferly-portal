import { requireEmployee } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { todayISO } from "@/lib/utils";
import { EmployeeLeadHistoryTable, type EmployeeLeadRow } from "./lead-history-table";
import { RealtimeRefresher } from "@/components/realtime-refresher";

export default async function EmployeeLeadHistoryPage() {
  const { profile } = await requireEmployee();
  const admin = createAdminClient();
  const today = todayISO();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: employee }, { data: transfers }] = await Promise.all([
    admin.from("employees").select("pkr_rate_per_transfer").eq("id", profile.employee_id!).single(),
    // Deliberately never select `value` — employees must never see client dollar amounts.
    admin
      .from("transfers")
      .select(
        "id, client_id, transfer_date, transfer_time, lead_name, phone, state, insurance_type, notes, status, decline_reason, dob, address, num_cars, cars, current_carrier, home_owner, created_at"
      )
      .eq("submitted_by_employee_id", profile.employee_id!)
      .order("transfer_date", { ascending: false }),
  ]);

  const rate = employee?.pkr_rate_per_transfer ?? 0;
  const rows = (transfers ?? []) as EmployeeLeadRow[];

  const clientIds = Array.from(new Set(rows.map((r) => r.client_id)));
  const { data: clients } = clientIds.length
    ? await admin.from("clients").select("id, business_name").in("id", clientIds)
    : { data: [] as { id: string; business_name: string }[] };
  const clientNames = Object.fromEntries((clients ?? []).map((c) => [c.id, c.business_name]));

  const todayCount = rows.filter((r) => r.transfer_date === today).length;
  const weekCount = rows.filter((r) => r.transfer_date >= weekAgo).length;
  const monthCount = rows.filter((r) => r.transfer_date >= monthAgo).length;
  const allCount = rows.length;

  const pkr = (n: number) => "₨ " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n * rate);

  return (
    <div className="flex flex-col gap-6">
      <RealtimeRefresher tables={["transfers"]} />
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">My leads</h1>
        <p className="mt-1 text-sm text-muted">
          Every lead you&apos;ve submitted, and what you&apos;re owed at Rs. {rate.toLocaleString()} per lead.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" value={todayCount} hint={pkr(todayCount)} accent="blue" />
        <StatCard label="This week" value={weekCount} hint={pkr(weekCount)} accent="neutral" />
        <StatCard label="This month" value={monthCount} hint={pkr(monthCount)} accent="gold" />
        <StatCard label="All time" value={allCount} hint={pkr(allCount)} accent="green" />
      </div>

      <Card>
        <CardHeader title="Submitted leads" description="Click a row to see full lead details." />
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-muted">No leads submitted yet. Go to &quot;Submit Lead&quot; to get started.</p>
        ) : (
          <EmployeeLeadHistoryTable rows={rows} clientNames={clientNames} pkrRate={rate} />
        )}
      </Card>
    </div>
  );
}
