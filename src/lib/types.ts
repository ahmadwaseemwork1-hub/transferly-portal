export type Role = "admin" | "client" | "employee";

export type TransferStatus = "pending" | "accepted" | "declined";

export type ClientStatus = "active" | "paused";
export type EmployeeStatus = "active" | "paused";

export interface Client {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  price_per_transfer: number | null;
  status: ClientStatus;
  notes: string | null;
  state: string | null;
  requirements: string | null;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  daily_cap: number;
  status: EmployeeStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeUpload {
  id: string;
  employee_id: string;
  upload_date: string;
  transfer_count: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  role: Role;
  client_id: string | null;
  employee_id: string | null;
  full_name: string | null;
  created_at: string;
}

export interface Transfer {
  id: string;
  client_id: string;
  transfer_date: string;
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
  invoice_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
