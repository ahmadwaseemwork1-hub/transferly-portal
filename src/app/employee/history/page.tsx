import { requireEmployee } from "@/lib/auth";
import { Card, CardHeader } from "@/components/ui";
import { TransferTable } from "@/components/transfer-table";
import type { Transfer } from "@/lib/types";

export default async function EmployeeHistoryPage() {
  const { supabase, profile } = await requireEmployee();

  const { data: transfers } = await supabase
    .from("transfers")
    .select("*")
    .eq("submitted_by", profile.employee_id!)
    .order("transfer_date", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">History</h1>
        <p className="mt-1 text-sm text-muted">Every lead you've submitted.</p>
      </div>
      <Card>
        <CardHeader title="All submissions" />
        <TransferTable transfers={(transfers ?? []) as Transfer[]} showApproval />
      </Card>
    </div>
  );
}
