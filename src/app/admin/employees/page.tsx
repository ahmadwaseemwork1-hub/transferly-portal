import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Button, EmptyState, HeroBanner } from "@/components/ui";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Employee, EmployeeUpload } from "@/lib/types";
import { RealtimeRefresher } from "@/components/realtime-refresher";

export default async function AdminEmployeesPage() {
  const supabase = await createClient();

  const monthAgoISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: employees }, { data: uploads }, { data: leads }, { count: archivedCount }] = await Promise.all([
    supabase.from("employees").select("*").is("archived_at", null).order("name"),
    supabase.from("employee_uploads").select("employee_id, transfer_count, upload_date")
      .gte("upload_date", monthAgoISO),
    // Never select `value` — this page must not surface client dollar amounts.
    supabase.from("transfers").select("submitted_by_employee_id, transfer_date")
      .not("submitted_by_employee_id", "is", null)
      .gte("transfer_date", monthAgoISO),
    supabase.from("employees").select("id", { count: "exact", head: true }).not("archived_at", "is", null),
  ]);

  const empList = (employees ?? []) as Employee[];
  const uploadList = (uploads ?? []) as EmployeeUpload[];
  const leadList = (leads ?? []) as { submitted_by_employee_id: string; transfer_date: string }[];

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  function getStats(empId: string, pkrRate: number) {
    const empUploads = uploadList.filter(u => u.employee_id === empId);
    const todayTotal = empUploads.filter(u => u.upload_date === today).reduce((s, u) => s + u.transfer_count, 0);
    const weekTotal = empUploads.filter(u => u.upload_date >= weekAgo).reduce((s, u) => s + u.transfer_count, 0);
    const monthTotal = empUploads.reduce((s, u) => s + u.transfer_count, 0);

    const empLeads = leadList.filter(l => l.submitted_by_employee_id === empId);
    const leadsToday = empLeads.filter(l => l.transfer_date === today).length;
    const leadsWeek = empLeads.filter(l => l.transfer_date >= weekAgo).length;
    const leadsMonth = empLeads.length;
    const payable = { today: leadsToday * pkrRate, week: leadsWeek * pkrRate, month: leadsMonth * pkrRate };

    return { todayTotal, weekTotal, monthTotal, payable };
  }

  const activeCount = empList.filter(e => e.status === "active").length;
  const totalToday = uploadList.filter(u => u.upload_date === today).reduce((s, u) => s + u.transfer_count, 0);
  const totalMonth = uploadList.reduce((s, u) => s + u.transfer_count, 0);

  return (
    <div className="flex flex-col gap-6">
      <RealtimeRefresher tables={["employees", "employee_uploads", "transfers"]} />
      <HeroBanner
        title="Employees"
        subtitle={`${activeCount} active · ${totalToday} transfers today · ${totalMonth} this month${archivedCount ? ` · ${archivedCount} archived` : ""}`}
        badge="Team"
        action={
          <Link href="/admin/employees/new">
            <Button variant="outline" size="sm" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
              <Plus className="h-4 w-4" />
              Add employee
            </Button>
          </Link>
        }
      />

      {empList.length === 0 ? (
        <Card>
          <EmptyState
            title="No employees yet"
            description="Add your first employee to start tracking their daily transfers."
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {empList.map((emp) => {
            const stats = getStats(emp.id, emp.pkr_rate_per_transfer);
            const capUsed = stats.todayTotal;
            const capPct = emp.daily_cap > 0 ? Math.min(100, Math.round((capUsed / emp.daily_cap) * 100)) : 0;
            return (
              <Link key={emp.id} href={`/admin/employees/${emp.id}`}>
                <Card className="h-full p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-sm">
                        {emp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground leading-tight">{emp.name}</p>
                        <p className="text-xs text-muted mt-0.5">{emp.email}</p>
                      </div>
                    </div>
                    <Badge className={cn(emp.status === "active" ? "bg-success-soft text-success" : "bg-neutral-100 text-muted")}>
                      {emp.status}
                    </Badge>
                  </div>

                  {/* Daily cap progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted">Daily cap</span>
                      <span className={cn(
                        "font-semibold",
                        capPct >= 100 ? "text-danger" : capPct >= 75 ? "text-warning" : "text-foreground"
                      )}>
                        {capUsed} / {emp.daily_cap} ({capPct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-background overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          capPct >= 100 ? "bg-danger" : capPct >= 75 ? "bg-warning" : "bg-success"
                        )}
                        style={{ width: `${capPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-background p-2">
                      <p className="text-lg font-bold text-foreground">{stats.todayTotal}</p>
                      <p className="text-xs text-muted">Today</p>
                    </div>
                    <div className="rounded-lg bg-background p-2">
                      <p className="text-lg font-bold text-foreground">{stats.weekTotal}</p>
                      <p className="text-xs text-muted">Week</p>
                    </div>
                    <div className="rounded-lg bg-background p-2">
                      <p className="text-lg font-bold text-foreground">{stats.monthTotal}</p>
                      <p className="text-xs text-muted">Month</p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between rounded-lg bg-accent-soft px-3 py-2">
                    <span className="text-xs font-medium text-accent">Payable this month</span>
                    <span className="text-sm font-bold text-accent">
                      Rs. {stats.payable.month.toLocaleString()}
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
