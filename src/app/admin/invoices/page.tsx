import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client, Invoice } from "@/lib/types";
import { InvoiceStatusButton } from "@/components/invoice-status-actions";

export default async function AdminInvoicesPage() {
  const supabase = await createClient();

  const [{ data: invoices }, { data: clients }] = await Promise.all([
    supabase.from("invoices").select("*").order("created_at", { ascending: false }),
    supabase.from("clients").select("id, business_name"),
  ]);

  const invoiceList = (invoices ?? []) as Invoice[];
  const clientList = (clients ?? []) as Pick<Client, "id" | "business_name">[];
  const clientNames = Object.fromEntries(clientList.map((c) => [c.id, c.business_name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Invoices</h1>
        <p className="mt-1 text-sm text-muted">
          Generated from each client&apos;s accepted, unbilled transfers.
        </p>
      </div>

      <Card>
        {invoiceList.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Generate one from a client's detail page once they have accepted transfers."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-6 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Transfers</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoiceList.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0">
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/invoices/${inv.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {clientNames[inv.client_id] ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                    </td>
                    <td className="px-4 py-3 text-foreground">{inv.transfer_count}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusButton invoiceId={inv.id} currentStatus={inv.status} />
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
