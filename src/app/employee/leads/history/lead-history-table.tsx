"use client";

import { Fragment, useState } from "react";
import { LeadDetails } from "@/components/lead-details";
import { formatDate, statusBadgeClasses, cn } from "@/lib/utils";

export interface EmployeeLeadRow {
  id: string;
  client_id: string;
  transfer_date: string;
  transfer_time: string | null;
  lead_name: string | null;
  phone: string | null;
  state: string | null;
  insurance_type: string | null;
  notes: string | null;
  status: string;
  decline_reason: string | null;
  dob: string | null;
  address: string | null;
  num_cars: number | null;
  cars: string | null;
  current_carrier: string | null;
  home_owner: boolean | null;
  created_at: string;
}

export function EmployeeLeadHistoryTable({
  rows,
  clientNames,
  pkrRate,
}: {
  rows: EmployeeLeadRow[];
  clientNames: Record<string, string>;
  pkrRate: number;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-left font-medium">Client</th>
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">You earn</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Fragment key={r.id}>
              <tr
                onClick={() => setExpanded((cur) => (cur === r.id ? null : r.id))}
                className="cursor-pointer border-b border-border hover:bg-neutral-50"
              >
                <td className="px-4 py-3 font-medium text-foreground">{formatDate(r.transfer_date)}</td>
                <td className="px-4 py-3 text-foreground">{clientNames[r.client_id] ?? "—"}</td>
                <td className="px-4 py-3 text-foreground">{r.lead_name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", statusBadgeClasses(r.status))}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-primary">
                  Rs. {pkrRate.toLocaleString()}
                </td>
              </tr>
              {expanded === r.id && (
                <tr className="border-b border-border bg-background/50">
                  <td colSpan={5} className="px-4 py-4">
                    <LeadDetails transfer={r} />
                    {r.decline_reason && (
                      <p className="mt-2 text-sm text-danger">Decline reason: {r.decline_reason}</p>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
