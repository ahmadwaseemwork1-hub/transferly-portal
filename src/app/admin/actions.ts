"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapCsvRows, type ColumnMapping } from "@/lib/csv";
import { buildInvoiceDraft, formatInvoiceNumber } from "@/lib/invoice";
import { todayISO } from "@/lib/utils";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─── Clients ────────────────────────────────────────────────────────────────

export async function createClientAccount(input: {
  business_name: string; contact_name: string; email: string; phone: string;
  price_per_transfer: string; password: string; state?: string; requirements?: string;
}): Promise<ActionResult<{ clientId: string }>> {
  try { await requireAdmin(); } catch { return { ok: false, error: "Not authorized." }; }

  const businessName = input.business_name.trim();
  const email = input.email.trim().toLowerCase();
  if (!businessName) return { ok: false, error: "Business name is required." };
  if (!email) return { ok: false, error: "Email is required." };
  if (!input.password || input.password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

  const admin = createAdminClient();
  const { data: clientRow, error: clientError } = await admin.from("clients").insert({
    business_name: businessName,
    contact_name: input.contact_name.trim() || null,
    email,
    phone: input.phone.trim() || null,
    price_per_transfer: input.price_per_transfer ? Number(input.price_per_transfer) : null,
    state: input.state?.trim() || null,
    requirements: input.requirements?.trim() || null,
  }).select().single();

  if (clientError || !clientRow) return { ok: false, error: clientError?.message ?? "Could not create client." };

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email, password: input.password, email_confirm: true,
  });

  if (authError || !authData.user) {
    await admin.from("clients").delete().eq("id", clientRow.id);
    return { ok: false, error: authError?.message ?? "Could not create login." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id, role: "client", client_id: clientRow.id,
    full_name: input.contact_name.trim() || businessName,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("clients").delete().eq("id", clientRow.id);
    return { ok: false, error: profileError.message };
  }

  revalidatePath("/admin"); revalidatePath("/admin/clients");
  return { ok: true, data: { clientId: clientRow.id } };
}

export async function updateClientStatus(clientId: string, status: "active" | "paused"): Promise<ActionResult> {
  try { await requireAdmin(); } catch { return { ok: false, error: "Not authorized." }; }
  const admin = createAdminClient();
  const { error } = await admin.from("clients").update({ status }).eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/clients"); revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, data: undefined };
}

export async function updateClientDetails(clientId: string, data: {
  state?: string; requirements?: string; notes?: string;
}): Promise<ActionResult> {
  try { await requireAdmin(); } catch { return { ok: false, error: "Not authorized." }; }
  const admin = createAdminClient();
  const { error } = await admin.from("clients").update({
    state: data.state ?? null,
    requirements: data.requirements ?? null,
    notes: data.notes ?? null,
  }).eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, data: undefined };
}

export async function resetClientPassword(clientId: string, newPassword: string): Promise<ActionResult> {
  try { await requireAdmin(); } catch { return { ok: false, error: "Not authorized." }; }
  if (newPassword.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("client_id", clientId).eq("role", "client").single();
  if (!profile) return { ok: false, error: "No login found for this client." };
  const { error } = await admin.auth.admin.updateUserById(profile.id, { password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

// ─── Employees ──────────────────────────────────────────────────────────────

export async function createEmployeeAccount(input: {
  name: string; email: string; daily_cap: string; password: string; notes?: string;
}): Promise<ActionResult<{ employeeId: string }>> {
  try { await requireAdmin(); } catch { return { ok: false, error: "Not authorized." }; }

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return { ok: false, error: "Name is required." };
  if (!email) return { ok: false, error: "Email is required." };
  if (!input.password || input.password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

  const admin = createAdminClient();
  const { data: empRow, error: empError } = await admin.from("employees").insert({
    name, email,
    daily_cap: input.daily_cap ? Number(input.daily_cap) : 10,
    notes: input.notes?.trim() || null,
  }).select().single();

  if (empError || !empRow) return { ok: false, error: empError?.message ?? "Could not create employee." };

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email, password: input.password, email_confirm: true,
  });

  if (authError || !authData.user) {
    await admin.from("employees").delete().eq("id", empRow.id);
    return { ok: false, error: authError?.message ?? "Could not create login." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id, role: "employee", employee_id: empRow.id, full_name: name,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("employees").delete().eq("id", empRow.id);
    return { ok: false, error: profileError.message };
  }

  revalidatePath("/admin/employees");
  return { ok: true, data: { employeeId: empRow.id } };
}

export async function updateEmployeeCap(employeeId: string, daily_cap: number): Promise<ActionResult> {
  try { await requireAdmin(); } catch { return { ok: false, error: "Not authorized." }; }
  if (daily_cap < 0) return { ok: false, error: "Daily cap must be a positive number." };
  const admin = createAdminClient();
  const { error } = await admin.from("employees").update({ daily_cap }).eq("id", employeeId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/employees/${employeeId}`);
  return { ok: true, data: undefined };
}

export async function updateEmployeeStatus(employeeId: string, status: "active" | "paused"): Promise<ActionResult> {
  try { await requireAdmin(); } catch { return { ok: false, error: "Not authorized." }; }
  const admin = createAdminClient();
  const { error } = await admin.from("employees").update({ status }).eq("id", employeeId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/employees"); revalidatePath(`/admin/employees/${employeeId}`);
  return { ok: true, data: undefined };
}

export async function resetEmployeePassword(employeeId: string, newPassword: string): Promise<ActionResult> {
  try { await requireAdmin(); } catch { return { ok: false, error: "Not authorized." }; }
  if (newPassword.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("employee_id", employeeId).eq("role", "employee").single();
  if (!profile) return { ok: false, error: "No login found for this employee." };
  const { error } = await admin.auth.admin.updateUserById(profile.id, { password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

// ─── CSV upload ──────────────────────────────────────────────────────────────

export async function fetchClientLookup(): Promise<{ id: string; business_name: string }[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin.from("clients").select("id, business_name").order("business_name");
  return data ?? [];
}

export async function commitTransferUpload(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): Promise<ActionResult<{ inserted: number; skipped: number }>> {
  let adminUser;
  try { adminUser = await requireAdmin(); } catch { return { ok: false, error: "Not authorized." }; }

  const admin = createAdminClient();
  const { data: clients } = await admin.from("clients").select("id, business_name");
  const mapped = mapCsvRows(rows, mapping, clients ?? []);

  const valid = mapped.filter((r) => r.errors.length === 0);
  const skipped = mapped.length - valid.length;

  if (valid.length === 0) return { ok: false, error: "No valid rows to import. Check your column mapping." };

  const { error } = await admin.from("transfers").insert(
    valid.map((r) => ({
      client_id: r.clientId,
      transfer_date: r.transfer_date,
      transfer_time: r.transfer_time,
      lead_name: r.lead_name,
      phone: r.phone,
      state: r.state,
      insurance_type: r.insurance_type,
      value: r.value,
      notes: r.notes,
      status: "pending",
      created_by: adminUser.user.id,
    }))
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin"); revalidatePath("/client");
  return { ok: true, data: { inserted: valid.length, skipped } };
}

// ─── Manual lead entry ───────────────────────────────────────────────────────

export async function submitManualLeads(
  clientId: string,
  leads: Array<{
    lead_name?: string; phone?: string; state?: string; insurance_type?: string;
    transfer_date?: string; transfer_time?: string; value?: number; notes?: string;
  }>
): Promise<ActionResult<{ inserted: number }>> {
  let adminUser;
  try { adminUser = await requireAdmin(); } catch { return { ok: false, error: "Not authorized." }; }

  if (!clientId) return { ok: false, error: "Please select a client." };
  if (!leads.length) return { ok: false, error: "No leads to submit." };

  const admin = createAdminClient();
  const today = todayISO();

  const { error } = await admin.from("transfers").insert(
    leads.map((l) => ({
      client_id: clientId,
      transfer_date: l.transfer_date || today,
      transfer_time: l.transfer_time || null,
      lead_name: l.lead_name || null,
      phone: l.phone || null,
      state: l.state || null,
      insurance_type: l.insurance_type || "Auto",
      value: l.value || 0,
      notes: l.notes || null,
      status: "pending",
      created_by: adminUser.user.id,
    }))
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin"); revalidatePath("/client");
  return { ok: true, data: { inserted: leads.length } };
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export async function generateInvoiceForClient(clientId: string): Promise<ActionResult<{ invoiceId: string }>> {
  let adminUser;
  try { adminUser = await requireAdmin(); } catch { return { ok: false, error: "Not authorized." }; }

  const admin = createAdminClient();
  const { data: transfers, error: transfersError } = await admin
    .from("transfers").select("*").eq("client_id", clientId).eq("status", "accepted").is("invoice_id", null);
  if (transfersError) return { ok: false, error: transfersError.message };

  const draft = buildInvoiceDraft(transfers ?? []);
  if (!draft) return { ok: false, error: "No accepted, unbilled transfers for this client." };

  const { count } = await admin.from("invoices").select("id", { count: "exact", head: true });
  const invoiceNumber = formatInvoiceNumber(todayISO(), (count ?? 0) + 1);

  const { data: invoice, error: invoiceError } = await admin.from("invoices").insert({
    client_id: clientId,
    invoice_number: invoiceNumber,
    period_start: draft.periodStart,
    period_end: draft.periodEnd,
    total_amount: draft.totalAmount,
    transfer_count: draft.transferCount,
    created_by: adminUser.user.id,
  }).select().single();

  if (invoiceError || !invoice) return { ok: false, error: invoiceError?.message ?? "Could not create invoice." };

  await admin.from("transfers").update({ invoice_id: invoice.id }).in("id", draft.transferIds);

  revalidatePath("/admin/invoices"); revalidatePath(`/admin/clients/${clientId}`); revalidatePath("/client/invoices");
  return { ok: true, data: { invoiceId: invoice.id } };
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: "generated" | "sent" | "paid"
): Promise<ActionResult> {
  try { await requireAdmin(); } catch { return { ok: false, error: "Not authorized." }; }
  const admin = createAdminClient();
  const { error } = await admin.from("invoices").update({ status }).eq("id", invoiceId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/client/invoices");
  return { ok: true, data: undefined };
}

// ─── Data management ─────────────────────────────────────────────────────────

export async function clearAllTransfers(): Promise<ActionResult<{ deleted: number }>> {
  try { await requireAdmin(); } catch { return { ok: false, error: "Not authorized." }; }
  const admin = createAdminClient();
  // Delete all transfers (unlink invoices first to avoid FK issues)
  const { count } = await admin.from("transfers").select("id", { count: "exact", head: true });
  const { error } = await admin.from("transfers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin"); revalidatePath("/admin/overview"); revalidatePath("/client");
  return { ok: true, data: { deleted: count ?? 0 } };
}
