import { requireEmployee } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader } from "@/components/ui";
import type { EmployeeUpload, Employee } from "@/lib/types";

export default async function EmployeeHistoryPage() {
  const { profile } = await requireEmployee();
  const admin = createAdminClient();

  const [{ data: employee }, { data: uploads }] = await Promise.all([
    admin.from("employees").select("daily_cap, name").eq("id", profile.employee_id!).single(),
    admin.from("employee_uploads").select("*").eq("employee_id", profile.employee_id!).order("upload_date", { ascending: false }),
  ]);

  const uploadList = (uploads ?? []) as EmployeeUpload[];
  const dailyCap = (employee as Employee)?.daily_cap ?? 0;
  const total = uploadList.reduce((s, u) => s + u.transfer_count, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Transfer history</h1>
        <p className="mt-1 text-sm text-muted">
          All your logged transfer activity — {uploadList.length} entries, {total} total transfers.
        </p>
      </div>

      <Card>
        <CardHeader title="All uploads" description={`Daily cap: ${dailyCap} transfers/day`} />
        {uploadList.length === 0 ? (
          <p className="p-6 text-sm text-muted">No uploads yet. Go to &quot;Log Transfers&quot; to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Transfers</th>
                  <th className="px-4 py-3 text-left font-medium">vs Cap</th>
                  <th className="px-4 py-3 text-left font-medium">Notes</th>
                  <th className="px-4 py-3 text-left font-medium">Logged at</th>
                </tr>
              </thead>
              <tbody>
                {uploadList.map((u) => {
                  const pct = dailyCap > 0 ? Math.round((u.transfer_count / dailyCap) * 100) : 0;
                  return (
                    <tr key={u.id} className="border-b border-border hover:bg-neutral-50">
                      <td className="px-4 py-3 font-medium text-foreground">{u.upload_date}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {u.transfer_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">{pct}% of {dailyCap} cap</td>
                      <td className="px-4 py-3 text-muted">{u.notes || "—"}</td>
                      <td className="px-4 py-3 text-muted text-xs">{new Date(u.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-neutral-50">
                  <td className="px-4 py-3 font-semibold text-foreground">Total</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">{total}</span>
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
