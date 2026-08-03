import type { Client, Invoice, Transfer } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PrintButton } from "./print-button";
import { DownloadInvoiceButton } from "./download-invoice-button";

export function InvoiceDocument({
  invoice, client, transfers,
}: {
  invoice: Invoice;
  client: Client;
  transfers: Transfer[];
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex justify-end gap-2">
        <DownloadInvoiceButton invoiceNumber={invoice.invoice_number} />
        <PrintButton />
      </div>
      <div id="invoice-document" className="rounded-xl border border-border bg-surface p-8 shadow-sm print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-border pb-6">
          <div>
            <p className="font-serif text-xl font-semibold text-primary">VOXPACT</p>
            <p className="mt-1 text-sm text-muted">Auto Insurance Live Transfer Billing</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">{invoice.invoice_number}</p>
            <p className="text-sm text-muted">{formatDate(invoice.created_at.slice(0, 10))}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Billed to</p>
            <p className="mt-1 font-medium text-foreground">{client.business_name}</p>
            {client.state && <p className="text-sm text-muted">{client.state}</p>}
            <p className="text-sm text-muted">{client.contact_name}</p>
            <p className="text-sm text-muted">{client.email}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Period</p>
            <p className="mt-1 text-sm text-foreground">
              {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
            </p>
          </div>
        </div>

        <table className="mt-8 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="py-2 font-medium">Date</th>
              <th className="py-2 font-medium">Lead</th>
              <th className="py-2 font-medium">State</th>
              <th className="py-2 font-medium">Insurance type</th>
              <th className="py-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id} className="border-b border-border">
                <td className="py-2 text-foreground">{formatDate(t.transfer_date)}</td>
                <td className="py-2 text-foreground">{t.lead_name ?? "—"}</td>
                <td className="py-2 text-muted">{t.state ?? "—"}</td>
                <td className="py-2 text-muted">{t.insurance_type ?? "—"}</td>
                <td className="py-2 text-right text-foreground">{formatCurrency(t.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs">
            <div className="flex justify-between border-t border-border py-2 text-sm">
              <span className="text-muted">Transfers</span>
              <span className="text-foreground">{invoice.transfer_count}</span>
            </div>
            <div className="flex justify-between border-t border-border py-2 text-base font-semibold">
              <span className="text-foreground">Total due</span>
              <span className="text-primary">{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-4 text-center text-xs text-muted">
          VOXPACT — Auto Insurance Live Transfer Portal
        </div>
      </div>
    </div>
  );
}
