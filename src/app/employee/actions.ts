"use server";

import { revalidatePath } from "next/cache";
import { requireEmployee } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function submitDailyUpload(input: {
  transfer_count: number;
  upload_date: string;
  notes?: string;
}): Promise<ActionResult<{ uploadId: string }>> {
  let emp;
  try { emp = await requireEmployee(); } catch { return { ok: false, error: "Not authorized." }; }

  if (!input.transfer_count || input.transfer_count < 1) {
    return { ok: false, error: "Transfer count must be at least 1." };
  }
  if (!input.upload_date) {
    return { ok: false, error: "Date is required." };
  }

  const admin = createAdminClient();

  // Check daily cap
  const { data: employee } = await admin.from("employees").select("daily_cap").eq("id", emp.profile.employee_id!).single();
  const { data: todayUploads } = await admin
    .from("employee_uploads")
    .select("transfer_count")
    .eq("employee_id", emp.profile.employee_id!)
    .eq("upload_date", input.upload_date);

  const alreadyLogged = (todayUploads ?? []).reduce((s: number, u: { transfer_count: number }) => s + u.transfer_count, 0);
  const dailyCap = employee?.daily_cap ?? 999;

  if (alreadyLogged + input.transfer_count > dailyCap) {
    return {
      ok: false,
      error: `This would exceed your daily cap of ${dailyCap}. You've already logged ${alreadyLogged} today. You can log at most ${Math.max(0, dailyCap - alreadyLogged)} more.`,
    };
  }

  const { data: upload, error } = await admin.from("employee_uploads").insert({
    employee_id: emp.profile.employee_id!,
    upload_date: input.upload_date,
    transfer_count: input.transfer_count,
    notes: input.notes?.trim() || null,
    created_by: emp.user.id,
  }).select().single();

  if (error || !upload) return { ok: false, error: error?.message ?? "Could not save upload." };

  revalidatePath("/employee");
  revalidatePath("/employee/history");
  revalidatePath("/admin/employees");
  return { ok: true, data: { uploadId: upload.id } };
}

export type ClientLookupForEmployee = { id: string; business_name: string; status: string };

/** Employee-safe client lookup — never exposes price_per_transfer or other sensitive fields. */
export async function fetchClientLookupForEmployee(): Promise<ClientLookupForEmployee[]> {
  try {
    await requireEmployee();
  } catch {
    return [];
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select("id, business_name, status")
    .is("archived_at", null)
    .order("business_name");
  return (data ?? []) as ClientLookupForEmployee[];
}

export interface SubmitLeadInput {
  client_id: string;
  lead_name: string;
  phone: string;
  dob: string;
  address: string;
  num_cars: number;
  cars: string;
  current_carrier: string;
  home_owner: boolean;
  transfer_date: string;
  state?: string;
  insurance_type?: string;
  notes?: string;
}

const MANDATORY_LEAD_FIELDS: Array<[keyof SubmitLeadInput, string]> = [
  ["client_id", "Client"],
  ["lead_name", "Name"],
  ["phone", "Phone"],
  ["dob", "Date of birth"],
  ["address", "Address"],
  ["current_carrier", "Current carrier"],
  ["cars", "Car(s)"],
];

export async function submitEmployeeLead(
  input: SubmitLeadInput
): Promise<ActionResult<{ transferId: string }>> {
  let emp;
  try { emp = await requireEmployee(); } catch { return { ok: false, error: "Not authorized." }; }

  const missing = MANDATORY_LEAD_FIELDS.filter(([key]) => !String(input[key] ?? "").trim()).map(([, label]) => label);
  if (!input.num_cars || input.num_cars < 1) missing.push("Number of cars");
  if (input.home_owner === undefined || input.home_owner === null) missing.push("Home owner");
  if (!input.transfer_date) missing.push("Date");
  if (missing.length > 0) {
    return { ok: false, error: `Please fill in required fields: ${missing.join(", ")}.` };
  }

  const admin = createAdminClient();

  // Daily cap: count real leads this employee has submitted today.
  const { data: employee } = await admin.from("employees").select("daily_cap").eq("id", emp.profile.employee_id!).single();
  const dailyCap = employee?.daily_cap ?? 999;
  const { count: todayCount } = await admin
    .from("transfers")
    .select("id", { count: "exact", head: true })
    .eq("submitted_by_employee_id", emp.profile.employee_id!)
    .eq("transfer_date", input.transfer_date);

  if ((todayCount ?? 0) >= dailyCap) {
    return { ok: false, error: `This would exceed your daily cap of ${dailyCap} leads for ${input.transfer_date}.` };
  }

  const { data: client } = await admin
    .from("clients")
    .select("business_name, price_per_transfer, status, archived_at")
    .eq("id", input.client_id)
    .single();

  if (!client || client.archived_at) {
    return { ok: false, error: "Selected client is not available." };
  }
  if (client.status !== "active") {
    return { ok: false, error: `${client.business_name} is currently paused and cannot receive new leads.` };
  }

  // Duplicate check: same phone number already sent to this client.
  const { data: existing } = await admin
    .from("transfers")
    .select("id")
    .eq("client_id", input.client_id)
    .eq("phone", input.phone.trim())
    .limit(1);

  if (existing && existing.length > 0) {
    await admin.from("duplicate_lead_attempts").insert({
      client_id: input.client_id,
      employee_id: emp.profile.employee_id!,
      phone: input.phone.trim(),
    });
    return {
      ok: false,
      error: `Duplicate lead — a lead with this phone number was already sent to ${client.business_name}.`,
    };
  }

  const { data: transfer, error } = await admin.from("transfers").insert({
    client_id: input.client_id,
    transfer_date: input.transfer_date,
    lead_name: input.lead_name.trim(),
    phone: input.phone.trim(),
    dob: input.dob,
    address: input.address.trim(),
    num_cars: input.num_cars,
    cars: input.cars.trim(),
    current_carrier: input.current_carrier.trim(),
    home_owner: input.home_owner,
    state: input.state?.trim() || null,
    insurance_type: input.insurance_type?.trim() || null,
    notes: input.notes?.trim() || null,
    value: client.price_per_transfer ?? 0,
    submitted_by_employee_id: emp.profile.employee_id!,
    created_by: emp.user.id,
    status: "pending",
  }).select().single();

  if (error || !transfer) return { ok: false, error: error?.message ?? "Could not submit lead." };

  revalidatePath("/employee");
  revalidatePath("/employee/leads");
  revalidatePath("/employee/leads/history");
  revalidatePath("/admin");
  revalidatePath("/client");
  return { ok: true, data: { transferId: transfer.id } };
}

export async function submitCSVUploads(
  rows: Array<{ date: string; count: number; notes?: string }>
): Promise<ActionResult<{ inserted: number }>> {
  let emp;
  try { emp = await requireEmployee(); } catch { return { ok: false, error: "Not authorized." }; }
  if (!rows.length) return { ok: false, error: "No rows to import." };

  const admin = createAdminClient();
  const { data: employee } = await admin.from("employees").select("daily_cap").eq("id", emp.profile.employee_id!).single();
  const dailyCap = employee?.daily_cap ?? 999;

  const toInsert = rows.map(r => ({
    employee_id: emp.profile.employee_id!,
    upload_date: r.date,
    transfer_count: Math.min(r.count, dailyCap),
    notes: r.notes || null,
    created_by: emp.user.id,
  }));

  const { error } = await admin.from("employee_uploads").insert(toInsert);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/employee"); revalidatePath("/employee/history"); revalidatePath("/admin/employees");
  return { ok: true, data: { inserted: toInsert.length } };
}
