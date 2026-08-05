"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import type { Transfer } from "@/lib/types";
import { Badge, Button } from "@/components/ui";
import { formatCurrency, formatDate, statusBadgeClasses, billingBadgeClasses, cn } from "@/lib/utils";
import { deleteTransfer } from "@/app/admin/actions";
import { Trash2, ChevronDown } from "lucide-react";
import { LeadDetails } from "@/components/lead-details";

function DeleteLeadButton({ transferId }: { transferId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const r = await deleteTransfer(transferId);
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-muted hover:text-danger"
        aria-label="Delete lead"
        title="Delete lead"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <Button variant="danger" size="sm" onClick={handleDelete} disabled={loading}>
          {loading ? "Deleting..." : "Confirm"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={loading}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function TransferTable({
  transfers,
  showClient,
  clientNames,
  showApproval,
  hideValue,
  adminDeletable,
}: {
  transfers: Transfer[];
  showClient?: boolean;
  clientNames?: Record<string, string>;
  showApproval?: boolean;
  /** Employees must never see the client's dollar value — only their own PKR pay. */
  hideValue?: boolean;
  /** Show a delete button for leads not yet invoiced. */
  adminDeletable?: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (transfers.length === 0) {
    return (
      <div className="px-6 py-16 text-center text-sm text-muted">
        No transfers to show yet.
      </div>
    );
  }

  // Base 7 = chevron, date, lead, state, insurance type, status, billing.
  const colSpan =
    7 + (showClient ? 1 : 0) + (hideValue ? 0 : 1) + (showApproval ? 1 : 0) + (adminDeletable ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th className="w-8 px-2 py-3" />
            <th className="px-6 py-3 font-medium">Date</th>
            {showClient && <th className="px-4 py-3 font-medium">Client</th>}
            <th className="px-4 py-3 font-medium">Lead</th>
            <th className="px-4 py-3 font-medium">State</th>
            <th className="px-4 py-3 font-medium">Insurance type</th>
            {!hideValue && <th className="px-4 py-3 font-medium">Value</th>}
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Billing</th>
            {showApproval && <th className="px-4 py-3 font-medium">Payroll</th>}
            {adminDeletable && <th className="px-4 py-3 font-medium" />}
          </tr>
        </thead>
        <tbody>
          {transfers.map((t) => {
            const isExpanded = expanded === t.id;
            return (
              <Fragment key={t.id}>
                <tr
                  onClick={() => setExpanded((cur) => (cur === t.id ? null : t.id))}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-primary-soft/40"
                >
                  <td className="px-2 py-3 text-muted">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                  </td>
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
                  {!hideValue && (
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                      {formatCurrency(t.value)}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge className={cn(statusBadgeClasses(t.status))}>{t.status}</Badge>
                    {t.status === "declined" && t.decline_reason && (
                      <p className="mt-1 text-xs text-muted">{t.decline_reason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.status === "accepted" ? (
                      <>
                        <Badge className={cn(billingBadgeClasses(t.billing_status))}>
                          {t.billing_status ?? "awaiting"}
                        </Badge>
                        {t.billing_status === "refund" && t.billing_note && (
                          <p className="mt-1 max-w-[16rem] text-xs text-muted">{t.billing_note}</p>
                        )}
                      </>
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
                  {adminDeletable && (
                    <td className="whitespace-nowrap px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {!t.invoice_id && <DeleteLeadButton transferId={t.id} />}
                    </td>
                  )}
                </tr>
                {isExpanded && (
                  <tr className="border-b border-border bg-background/50">
                    <td colSpan={colSpan} className="px-6 py-4">
                      <LeadDetails transfer={t} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
