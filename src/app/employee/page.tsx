import { requireEmployee } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, StatCard, HeroBanner } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Employee, EmployeeUpload } from "@/lib/types";

export default async function EmployeeDashboardPage() {
  const { profile } = await requireEmployee();
  const admin = createAdminClient();

  const [{ data: employee }, { data: uploads }] = await Promise.all([
    admin.from("employees").select("*").eq("id", profile.employee_id!).single(),
    admin.from("employee_uploads").select("*").eq("employee_id", profile.employee_id!).order("upload_date", { ascending: false }).limit(30),
  ]);

  const emp = employee as Employee;
  const uploadList = (uploads ?? []) as EmployeeUpload[];

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const todayTotal = uploadList.filter(u => u.upload_date === today).reduce((s, u) => s + u.transfer_count, 0);
  const weekTotal = uploadList.filter(u => u.upload_date >= weekAgo).reduce((s, u) => s + u.transfer_count, 0);
  const monthTotal = uploadList.filter(u => u.upload_date >= monthAgo).reduce((s, u) => s + u.transfer_count, 0);
  const allTime = uploadList.reduce((s, u) => s + u.transfer_count, 0);

  const capPct = emp?.daily_cap > 0 ? Math.min(100, Math.round((todayTotal / emp.daily_cap) * 100)) : 0;
  const remaining = Math.max(0, (emp?.daily_cap ?? 0) - todayTotal);

  const capStatus = capPct >= 100 ? "Cap reached!" : `${remaining} more you can log today`;

  return (
    <div className="flex flex-col gap-6">
      <HeroBanner
        title={`Welcome back, ${profile.full_name?.split(" ")[0] ?? "team"}!`}
        subtitle={`Daily cap: ${todayTotal} / ${emp?.daily_cap ?? 0} · ${capStatus}`}
        badge="Employee Portal"
        action={
          <div className="text-right">
            <p className={cn(
              "text-4xl font-bold",
              capPct >= 100 ? "text-red-300" : capPct >= 75 ? "text-yellow-300" : "text-green-300"
            )}>
              {capPct}%
            </p>
            <p className="text-xs text-white/60">cap used today</p>
          </div>
        }
      />

      {/* Daily cap progress bar */}
      {emp && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-foreground">Daily cap progress</p>
            <p className={cn(
              "text-sm font-semibold",
              capPct >= 100 ? "text-danger" : capPct >= 75 ? "text-warning" : "text-success"
            )}>
              {todayTotal} / {emp.daily_cap}
            </p>
          </div>
          <div className="h-3 rounded-full bg-background overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                capPct >= 100 ? "bg-danger" : capPct >= 75 ? "bg-warning" : "bg-success"
              )}
              style={{ width: `${capPct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>0</span>
            <span>{remaining > 0 ? `${remaining} remaining` : "Daily cap reached"}</span>
            <span>{emp.daily_cap}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today"
          value={todayTotal}
          hint={`of ${emp?.daily_cap ?? 0} daily cap`}
          accent={capPct >= 100 ? "red" : capPct >= 75 ? "gold" : "green"}
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="This week"
          value={weekTotal}
          hint="Last 7 days"
          accent="blue"
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          }
        />
        <StatCard
          label="This month"
          value={monthTotal}
          hint="Last 30 days"
          accent="neutral"
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <StatCard
          label="All time"
          value={allTime}
          hint="Total transfers logged"
          accent="blue"
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          }
        />
      </div>

      {/* Recent uploads */}
      <Card>
        <CardHeader
          title="Recent uploads"
          description="Your last 10 daily logs."
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        {uploadList.length === 0 ? (
          <p className="p-6 text-sm text-muted">No uploads yet. Head to &quot;Log Transfers&quot; to record today&apos;s activity.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted bg-background/50">
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Transfers</th>
                  <th className="px-5 py-3 text-left font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {uploadList.slice(0, 10).map((u, i) => (
                  <tr key={u.id} className={cn("border-b border-border last:border-0", i % 2 === 0 ? "" : "bg-background/30")}>
                    <td className="px-5 py-3.5 text-foreground font-medium">{u.upload_date}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                        {u.transfer_count}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{u.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
