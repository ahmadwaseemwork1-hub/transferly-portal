import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceDocument } from "@/components/invoice-document";
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
    <InvoiceDocument
      invoice={invoice}
      client={client}
      transfers={(transfers ?? []) as Transfer[]}
    />
  );
}
