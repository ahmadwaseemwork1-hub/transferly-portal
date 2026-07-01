import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { Card, Badge, EmptyState } from "@/components/ui";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Invoice } from "@/lib/types";

export default async function ClientInvoicesPage() {
  const { supabase, profile } = await requireClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("client_id", profile.client_id!)
    .order("created_at", { ascending: false });

  const invoiceList = (invoices ?? []) as Invoice[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Invoices</h1>
        <p className="mt-1 text-sm text-muted">Your billing history.</p>
      </div>
      <Card>
        {invoiceList.length === 0 ? (
          <EmptyState title="No invoices yet" description="They'll appear here once generated." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-6 py-3 font-medium">Invoice #</th>
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
                        href={`/client/invoices/${inv.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                    </td>
                    <td className="px-4 py-3 text-foreground">{inv.transfer_count}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          inv.status === "paid"
                            ? "bg-success-soft text-success"
                            : "bg-accent-soft text-accent"
                        )}
                      >
                        {inv.status}
                      </Badge>
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
