import type { Transfer } from "@/lib/types";
import { Badge } from "@/components/ui";
import { formatCurrency, formatDate, statusBadgeClasses, billingBadgeClasses, cn } from "@/lib/utils";

export function TransferTable({
  transfers,
  showClient,
  clientNames,
  showApproval,
}: {
  transfers: Transfer[];
  showClient?: boolean;
  clientNames?: Record<string, string>;
  showApproval?: boolean;
}) {
  if (transfers.length === 0) {
    return (
      <div className="px-6 py-16 text-center text-sm text-muted">
        No transfers to show yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th className="px-6 py-3 font-medium">Date</th>
            {showClient && <th className="px-4 py-3 font-medium">Client</th>}
            <th className="px-4 py-3 font-medium">Lead</th>
            <th className="px-4 py-3 font-medium">State</th>
            <th className="px-4 py-3 font-medium">Insurance type</th>
            <th className="px-4 py-3 font-medium">Value</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Billing</th>
            {showApproval && <th className="px-4 py-3 font-medium">Payroll</th>}
          </tr>
        </thead>
        <tbody>
          {transfers.map((t) => (
            <tr key={t.id} className="border-b border-border last:border-0">
              <td className="whitespace-nowrap px-6 py-3 text-foreground">
                {formatDate(t.transfer_date)}
                {t.transfer_time && (
                  <span className="ml-1 text-xs text-muted">{t.transfer_time}</span>
                )}
              </td>
              {showClient && (
                <td className="whitespace-nowrap px-4 py-3 text-foreground">
                  {clientNames?.[t.client_id] ?? "—"}
                </td>
              )}
              <td className="whitespace-nowrap px-4 py-3 text-foreground">
                {t.lead_name ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">{t.state ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">
                {t.insurance_type ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                {formatCurrency(t.value)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge className={cn(statusBadgeClasses(t.status))}>{t.status}</Badge>
                {t.status === "declined" && t.decline_reason && (
                  <p className="mt-1 text-xs text-muted">{t.decline_reason}</p>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {t.status === "accepted" ? (
                  <Badge className={cn(billingBadgeClasses(t.billing_status))}>
                    {t.billing_status ?? "awaiting"}
                  </Badge>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              {showApproval && (
                <td className="whitespace-nowrap px-4 py-3">
                  <Badge
                    className={cn(
                      t.employee_approved
                        ? "bg-success-soft text-success"
                        : "bg-warning-soft text-warning"
                    )}
                  >
                    {t.employee_approved ? "Approved" : "Pending"}
                  </Badge>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
