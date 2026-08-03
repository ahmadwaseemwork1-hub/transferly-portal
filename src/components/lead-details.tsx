import { formatDate } from "@/lib/utils";
import type { Transfer } from "@/lib/types";

/** Only the fields LeadDetails actually renders — deliberately excludes `value`
 *  so it can be reused on the employee's own lead history, which must never
 *  select the client dollar value from the database in the first place. */
export type LeadDetailsData = Pick<
  Transfer,
  | "lead_name"
  | "phone"
  | "dob"
  | "address"
  | "state"
  | "insurance_type"
  | "num_cars"
  | "cars"
  | "current_carrier"
  | "home_owner"
  | "notes"
>;

/**
 * Renders the full set of lead-detail fields for a transfer. Used everywhere
 * a lead needs to show "all info" — client pending/history views, admin
 * client detail, and employee's own submitted-lead history.
 */
export function LeadDetails({ transfer }: { transfer: LeadDetailsData }) {
  const rows: Array<[string, string]> = [
    ["Name", transfer.lead_name ?? "—"],
    ["Phone", transfer.phone ?? "—"],
    ["Date of birth", transfer.dob ? formatDate(transfer.dob) : "—"],
    ["Address", transfer.address ?? "—"],
    ["State", transfer.state ?? "—"],
    ["Insurance type", transfer.insurance_type ?? "—"],
    ["Number of cars", transfer.num_cars != null ? String(transfer.num_cars) : "—"],
    ["Car(s)", transfer.cars ?? "—"],
    ["Current carrier", transfer.current_carrier ?? "—"],
    [
      "Home owner",
      transfer.home_owner == null ? "—" : transfer.home_owner ? "Yes" : "No",
    ],
  ];

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-2 border-b border-border/60 py-1 text-sm sm:justify-start sm:gap-3">
          <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
          <span className="text-right text-foreground sm:text-left">{value}</span>
        </div>
      ))}
      {transfer.notes && (
        <div className="col-span-full border-t border-border/60 pt-2 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Notes</span>
          <p className="mt-0.5 text-foreground">{transfer.notes}</p>
        </div>
      )}
    </div>
  );
}
