import { formatDate } from "@/lib/utils";
import type { Transfer } from "@/lib/types";

/** Only the fields this component renders — deliberately excludes `value`
 *  so it can be reused on employee-facing views, which must never select
 *  the client dollar value from the database in the first place. */
export type LeadDetailsData = Pick<
  Transfer,
  | "lead_name"
  | "phone"
  | "email"
  | "date_of_birth"
  | "address"
  | "city"
  | "state"
  | "zip_code"
  | "insurance_type"
  | "vehicle_count"
  | "vehicles"
  | "current_carrier"
  | "policy_term"
  | "home_status"
  | "notes"
  | "lead_extra"
>;

/**
 * Renders the full set of lead-detail fields for a transfer — every field
 * captured at submission time, not just the name/phone/state summary line.
 * Used everywhere a lead needs to show "all info": client pending/accepted
 * cards, the shared admin/employee transfer table, and anywhere else a
 * single lead needs a full breakdown.
 */
export function LeadDetails({ transfer }: { transfer: LeadDetailsData }) {
  const rows: Array<[string, string]> = [
    ["Name", transfer.lead_name ?? "—"],
    ["Phone", transfer.phone ?? "—"],
    ["Email", transfer.email ?? "—"],
    ["Date of birth", transfer.date_of_birth ? formatDate(transfer.date_of_birth) : "—"],
    ["Address", transfer.address ?? "—"],
    ["City", transfer.city ?? "—"],
    ["State", transfer.state ?? "—"],
    ["Zip", transfer.zip_code ?? "—"],
    ["Insurance type", transfer.insurance_type ?? "—"],
    ["Home owner / renter", transfer.home_status ?? "—"],
    ["Number of cars", transfer.vehicle_count != null ? String(transfer.vehicle_count) : "—"],
    ["Car(s)", transfer.vehicles ?? "—"],
    ["Current carrier", transfer.current_carrier ?? "—"],
    ["Policy term", transfer.policy_term ?? "—"],
  ];

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-2 border-b border-border/60 py-1 text-sm sm:justify-start sm:gap-3">
          <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
          <span className="text-right text-foreground sm:text-left">{value}</span>
        </div>
      ))}
      {transfer.lead_extra && transfer.lead_extra.length > 0 && (
        <div className="col-span-full border-t border-border/60 pt-2 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Additional details</span>
          <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {transfer.lead_extra.map((f, i) => (
              <p key={i} className="text-foreground">
                <span className="text-muted">{f.label}:</span> {f.value || "—"}
              </p>
            ))}
          </div>
        </div>
      )}
      {transfer.notes && (
        <div className="col-span-full border-t border-border/60 pt-2 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Notes</span>
          <p className="mt-0.5 text-foreground">{transfer.notes}</p>
        </div>
      )}
    </div>
  );
}
