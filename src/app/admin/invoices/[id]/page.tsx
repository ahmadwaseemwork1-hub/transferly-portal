import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceDocument } from "@/components/invoice-document";
import { InvoiceStatusButton } from "@/components/invoice-status-actions";
import type { Transfer } from "@/lib/types";

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", id).single();
  if (!invoice) notFound();

  const [{ data: client }, { data: transfers }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", invoice.client_id).single(),
    supabase
      .from("transfers")
      .select("*")
      .eq("invoice_id", id)
      .order("transfer_date"),
  ]);

  if (!client) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print mx-auto flex w-full max-w-3xl justify-end">
        <InvoiceStatusButton invoiceId={invoice.id} currentStatus={invoice.status} />
      </div>
      <InvoiceDocument
        invoice={invoice}
        client={client}
        transfers={(transfers ?? []) as Transfer[]}
      />
    </div>
  );
}
