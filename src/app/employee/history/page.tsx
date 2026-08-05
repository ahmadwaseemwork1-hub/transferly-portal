import { requireEmployee } from "@/lib/auth";
import { Card, CardHeader } from "@/components/ui";
import { TransferTable } from "@/components/transfer-table";
import type { Transfer } from "@/lib/types";

export default async function EmployeeHistoryPage() {
  const { supabase, profile } = await requireEmployee();

  // Never select `value` here — employees only ever see their own PKR pay
  // (on the "My pay" page), never the client's dollar value. Every other
  // lead-detail field is fine to show in full.
  const { data: transfers } = await supabase
    .from("transfers")
    .select(
      "id, client_id, transfer_date, transfer_time, lead_name, phone, email, state, insurance_type, status, decline_reason, billing_status, billing_note, employee_approved, date_of_birth, address, city, zip_code, home_status, vehicle_count, vehicles, current_carrier, policy_term, lead_extra"
    )
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
        <TransferTable transfers={(transfers ?? []) as Transfer[]} showApproval hideValue />
      </Card>
    </div>
  );
}
