export type Role = "admin" | "client" | "employee";

export type TransferStatus = "pending" | "accepted" | "declined";
export type BillingStatus = "billable" | "refund";

export type ClientStatus = "active" | "paused";
export type CampaignStatus = "active" | "paused";

export interface Client {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  price_per_transfer: number | null;
  status: ClientStatus;
  notes: string | null;
  // Operational fields shown on the admin Clients page, editable any time.
  campaign_status: CampaignStatus;
  schedule_from: string | null; // "HH:MM:SS"
  schedule_to: string | null;
  paused_until: string | null; // ISO timestamp
  daily_cap: number | null;
  cooloff_minutes: number | null;
  accepted_states: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  role: Role;
  client_id: string | null;
  employee_id: string | null;
  full_name: string | null;
  created_at: string;
}

export type EmploymentType = "onsite" | "hybrid" | "remote" | "part_time";

export interface BonusTier {
  min_transfers: number;
  flat_amount: number;
}

export interface Employee {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  employment_type: EmploymentType;
  status: "active" | "inactive";
  base_rate_pkr: number;
  bonus_tiers: BonusTier[];
  daily_cap: number | null;
  start_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeClientAssignment {
  id: string;
  employee_id: string;
  client_id: string;
  created_at: string;
}

/** A labeled raw value from an ambiguous paste column — shown editable, never dropped. */
export interface LeadExtraField {
  label: string;
  value: string;
}

export interface Transfer {
  id: string;
  client_id: string;
  transfer_date: string; // YYYY-MM-DD
  transfer_time: string | null;
  lead_name: string | null;
  phone: string | null;
  state: string | null;
  insurance_type: string | null;
  value: number;
  notes: string | null;
  status: TransferStatus;
  decline_reason: string | null;
  responded_at: string | null;
  // Two-stage outcome after acceptance: null while the call is in progress /
  // not yet resolved, then "billable" or "refund" once decided.
  billing_status: BillingStatus | null;
  billing_decided_at: string | null;
  billing_decided_by: string | null;
  invoice_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Lead-detail fields captured from the paste-parser (nullable — CSV-uploaded
  // transfers won't have these).
  date_of_birth: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  zip_code: string | null;
  home_status: string | null;
  vehicle_count: number | null;
  vehicles: string | null;
  current_carrier: string | null;
  policy_term: string | null;
  lead_extra: LeadExtraField[];
  submitted_by: string | null;
  employee_approved: boolean;
  employee_approved_at: string | null;
  employee_approved_by: string | null;
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  transfer_count: number;
  status: "generated" | "sent" | "paid";
  created_by: string | null;
  created_at: string;
}

/** The canonical set of fields the app understands from an uploaded CSV. */
export const TRANSFER_FIELDS = [
  "client",
  "transfer_date",
  "transfer_time",
  "lead_name",
  "phone",
  "state",
  "insurance_type",
  "value",
  "notes",
] as const;

export type TransferField = (typeof TRANSFER_FIELDS)[number];

export const TRANSFER_FIELD_LABELS: Record<TransferField, string> = {
  client: "Client (name or ID)",
  transfer_date: "Date",
  transfer_time: "Transfer time",
  lead_name: "Lead name",
  phone: "Phone",
  state: "State",
  insurance_type: "Insurance type",
  value: "Value / premium",
  notes: "Notes",
};

export const REQUIRED_TRANSFER_FIELDS: TransferField[] = [
  "client",
  "transfer_date",
];

export type Currency = "PKR" | "USD";

export interface ExchangeRate {
  id: string;
  rate_date: string;
  pkr_per_usd: number;
  entered_by: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  currency: Currency;
  expense_date: string;
  recurring: boolean;
  created_by: string | null;
  created_at: string;
}

export type Platform = "payoneer" | "paypal" | "bank_transfer" | "other";

export interface RevenueEntry {
  id: string;
  client_id: string | null;
  platform: Platform;
  gross_amount: number;
  fee_amount: number;
  tax_amount: number;
  net_amount: number;
  currency: Currency;
  received_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}
