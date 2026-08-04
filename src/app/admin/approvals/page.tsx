import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transfer, Employee, Client } from "@/lib/types";
import { ApprovalButtons } from "./approval-actions";

export default async function ApprovalsPage() {
  const supabase = await createClient();

  const [{ data: transfers }, { data: employees }, { data: clients }] = await Promise.all([
    supabase
      .from("transfers")
      .select("*")
      .eq("employee_approved", false)
      .not("submitted_by", "is", null)
      .order("created_at", { ascending: false }),
    supabase.from("employees").select("id, full_name"),
    supabase.from("clients").select("id, business_name"),
  ]);

  const transferList = (transfers ?? []) as Transfer[];
  const employeeNames = Object.fromEntries(
    ((employees ?? []) as Pick<Employee, "id" | "full_name">[]).map((e) => [e.id, e.full_name])
  );
  const clientNames = Object.fromEntries(
    ((clients ?? []) as Pick<Client, "id" | "business_name">[]).map((c) => [c.id, c.business_name])
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Approvals</h1>
        <p className="mt-1 text-sm text-muted">
          Employee-submitted transfers waiting for payroll credit approval.
        </p>
      </div>

      <Card>
        {transferList.length === 0 ? (
          <EmptyState title="Nothing pending" description="All caught up." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {transferList.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-6 py-3 text-foreground">{formatDate(t.transfer_date)}</td>
                    <td className="px-4 py-3 text-foreground">
                      {t.submitted_by ? employeeNames[t.submitted_by] ?? "—" : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">{clientNames[t.client_id] ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground">{t.lead_name ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatCurrency(t.value)}
                    </td>
                    <td className="px-4 py-3">
                      <ApprovalButtons transferId={t.id} />
                    </td>
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
