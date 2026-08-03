"use client";

import { Fragment, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Transfer } from "@/lib/types";
import { Badge, Button } from "@/components/ui";
import { formatCurrency, formatDate, statusBadgeClasses, cn } from "@/lib/utils";
import { Search, Filter, X, ChevronDown, Trash2 } from "lucide-react";
import { LeadDetails } from "@/components/lead-details";
import { BillableToggle } from "@/components/billable-toggle";
import { deleteTransfer } from "@/app/admin/actions";

const STATUS_OPTIONS = ["all", "pending", "accepted", "declined"] as const;

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
    if (!r.ok) { setError(r.error); return; }
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
        <Trash2 className="h-3.5 w-3.5" /> Delete lead
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-foreground">Delete this lead permanently?</span>
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

export function FilterableTransferTable({
  transfers,
  showClient,
  clientNames,
  showBillable,
  adminDeletable,
}: {
  transfers: Transfer[];
  showClient?: boolean;
  clientNames?: Record<string, string>;
  /** Show an editable billable/non-billable control on accepted transfers. */
  showBillable?: boolean;
  /** Show a delete button (in the expanded row) for leads not yet invoiced. */
  adminDeletable?: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return transfers.filter((t) => {
      // Status filter
      if (statusFilter !== "all" && t.status !== statusFilter) return false;

      // Date range filter
      if (dateFrom && t.transfer_date < dateFrom) return false;
      if (dateTo && t.transfer_date > dateTo) return false;

      // Text search across multiple fields
      if (search.trim()) {
        const q = search.toLowerCase();
        const fields = [
          t.lead_name,
          t.phone,
          t.state,
          t.insurance_type,
          t.notes,
          t.decline_reason,
          showClient ? clientNames?.[t.client_id] : null,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!fields.includes(q)) return false;
      }

      return true;
    });
  }, [transfers, search, statusFilter, dateFrom, dateTo, showClient, clientNames]);

  const hasActiveFilters =
    statusFilter !== "all" || dateFrom || dateTo || search.trim();

  const clearAll = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  if (transfers.length === 0) {
    return (
      <div className="px-6 py-16 text-center text-sm text-muted">
        No transfers to show yet.
      </div>
    );
  }

  return (
    <div>
      {/* Search + filter toolbar */}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lead name, state, type…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === s
                  ? "bg-primary text-white"
                  : "bg-background border border-border text-muted hover:text-foreground"
              )}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Date filter toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
            showFilters
              ? "border-primary bg-primary-soft text-primary"
              : "border-border bg-background text-muted hover:text-foreground"
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          Date range
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-danger hover:text-danger/80"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Date range inputs */}
      {showFilters && (
        <div className="flex flex-col gap-2 border-b border-border bg-neutral-50/50 px-4 py-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-xs text-muted">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-border bg-white px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-border bg-white px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="text-xs text-muted hover:text-foreground"
            >
              Clear dates
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      {hasActiveFilters && (
        <div className="px-4 py-2 text-xs text-muted border-b border-border">
          {filtered.length} of {transfers.length} transfers
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted">
          No transfers match your filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="w-8 px-2 py-3" />
                <th className="px-6 py-3 font-medium">Date</th>
                {showClient && <th className="px-4 py-3 font-medium">Client</th>}
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Insurance type</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {showBillable && <th className="px-4 py-3 font-medium">Billable</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const isExpanded = expanded === t.id;
                const colSpan = 7 + (showClient ? 1 : 0) + (showBillable ? 1 : 0);
                return (
                  <Fragment key={t.id}>
                    <tr
                      onClick={() => setExpanded((cur) => (cur === t.id ? null : t.id))}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-neutral-50/50 transition-colors"
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
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                        {formatCurrency(t.value)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge className={cn(statusBadgeClasses(t.status))}>{t.status}</Badge>
                        {t.status === "declined" && t.decline_reason && (
                          <p className="mt-1 text-xs text-muted">{t.decline_reason}</p>
                        )}
                      </td>
                      {showBillable && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {t.status === "accepted" ? (
                            <BillableToggle transferId={t.id} billable={t.billable} note={t.billable_note} />
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-border bg-background/50">
                        <td colSpan={colSpan} className="px-6 py-4">
                          <LeadDetails transfer={t} />
                          {adminDeletable && !t.invoice_id && (
                            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                              <DeleteLeadButton transferId={t.id} />
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
