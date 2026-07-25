import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, Badge, StatCard } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import type { Employee, EmployeeUpload } from "@/lib/types";
import { EmployeeActions } from "./client-actions";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: employee }, { data: uploads }] = await Promise.all([
    supabase.from("employees").select("*").eq("id", id).single(),
    supabase.from("employee_uploads").select("*").eq("employee_id", id).order("upload_date", { ascending: false }).limit(60),
  ]);

  if (!employee) notFound();

  const emp = employee as Employee;
  const uploadList = (uploads ?? []) as EmployeeUpload[];

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const todayTotal = uploadList.filter(u => u.upload_date === today).reduce((s, u) => s + u.transfer_count, 0);
  const weekTotal = uploadList.filter(u => u.upload_date >= weekAgo).reduce((s, u) => s + u.transfer_count, 0);
  const monthTotal = uploadList.filter(u => u.upload_date >= monthAgo).reduce((s, u) => s + u.transfer_count, 0);
  const allTime = uploadList.reduce((s, u) => s + u.transfer_count, 0);

  const capPct = emp.daily_cap > 0 ? Math.min(100, Math.round((todayTotal / emp.daily_cap) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/employees" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to employees
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-xl">
            {emp.name.slice(0,2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-2xl font-semibold text-foreground">{emp.name}</h1>
              <Badge className={cn(emp.status === "active" ? "bg-success-soft text-success" : "bg-neutral-100 text-muted")}>
                {emp.status}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted">{emp.email}</p>
          </div>
        </div>
      </div>

      {/* Daily cap progress */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-foreground">Today's progress</p>
            <p className="text-xs text-muted">{todayTotal} of {emp.daily_cap} daily cap used</p>
          </div>
          <span className={cn("text-2xl font-bold", capPct >= 100 ? "text-danger" : capPct >= 75 ? "text-warning" : "text-success")}>
            {capPct}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", capPct >= 100 ? "bg-danger" : capPct >= 75 ? "bg-warning" : "bg-success")}
            style={{ width: `${capPct}%` }} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" value={todayTotal} />
        <StatCard label="This week" value={weekTotal} />
        <StatCard label="This month" value={monthTotal} />
        <StatCard label="All time" value={allTime} />
      </div>

      <EmployeeActions employee={emp} />

      {/* Upload history */}
      <Card>
        <CardHeader title="Upload history" description="Daily transfer counts uploaded by this employee." />
        {uploadList.length === 0 ? (
          <p className="p-6 text-sm text-muted">No uploads yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Transfers</th>
                  <th className="px-4 py-3 text-left font-medium">Notes</th>
                  <th className="px-4 py-3 text-left font-medium">Uploaded at</th>
                </tr>
              </thead>
              <tbody>
                {uploadList.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-foreground">{formatDate(u.upload_date)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {u.transfer_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{u.notes || "—"}</td>
                    <td className="px-4 py-3 text-muted text-xs">{new Date(u.created_at).toLocaleString()}</td>
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
