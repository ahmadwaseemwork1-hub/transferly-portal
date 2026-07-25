import { requireClient } from "@/lib/auth";
import { Card, CardHeader } from "@/components/ui";
import { FilterableTransferTable } from "@/components/filterable-transfer-table";
import type { Transfer } from "@/lib/types";

export default async function ClientHistoryPage() {
  const { supabase, profile } = await requireClient();

  const { data: transfers } = await supabase
    .from("transfers")
    .select("*")
    .eq("client_id", profile.client_id!)
    .order("transfer_date", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">History</h1>
        <p className="mt-1 text-sm text-muted">Every transfer you've ever received.</p>
      </div>
      <Card>
        <CardHeader title="All transfers" description="Search by lead name, filter by status or date range." />
        <FilterableTransferTable transfers={(transfers ?? []) as Transfer[]} />
      </Card>
    </div>
  );
}
