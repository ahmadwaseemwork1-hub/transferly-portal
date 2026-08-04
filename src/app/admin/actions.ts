"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, authErrorMessage } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapCsvRows, type ColumnMapping } from "@/lib/csv";
import { buildInvoiceDraft, formatInvoiceNumber } from "@/lib/invoice";
import { todayISO } from "@/lib/utils";
import type { BonusTier, EmploymentType } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export async function createClientAccount(input: {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  price_per_transfer: string;
  password: string;
}): Promise<ActionResult<{ clientId: string }>> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }

  const businessName = input.business_name.trim();
  const email = input.email.trim().toLowerCase();

  if (!businessName) return { ok: false, error: "Business name is required." };
  if (!email) return { ok: false, error: "Email is required." };
  if (!input.password || input.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const admin = createAdminClient();

  const { data: clientRow, error: clientError } = await admin
    .from("clients")
    .insert({
      business_name: businessName,
      contact_name: input.contact_name.trim() || null,
      email,
      phone: input.phone.trim() || null,
      price_per_transfer: input.price_per_transfer
        ? Number(input.price_per_transfer)
        : null,
    })
    .select()
    .single();

  if (clientError || !clientRow) {
    return { ok: false, error: clientError?.message ?? "Could not create client." };
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    await admin.from("clients").delete().eq("id", clientRow.id);
    return { ok: false, error: authError?.message ?? "Could not create login." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    role: "client",
    client_id: clientRow.id,
    full_name: input.contact_name.trim() || businessName,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("clients").delete().eq("id", clientRow.id);
    return { ok: false, error: profileError.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  return { ok: true, data: { clientId: clientRow.id } };
}

export async function updateClientStatus(
  clientId: string,
  status: "active" | "paused"
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("clients").update({ status }).eq("id", clientId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, data: undefined };
}

/** Archive is a reversible soft-delete: hides the client from active lists
 *  and blocks their login, but keeps every historical transfer/invoice intact. */
export async function archiveClient(clientId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, data: undefined };
}

export async function restoreClient(clientId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("clients").update({ archived_at: null }).eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, data: undefined };
}

export async function resetClientPassword(
  clientId: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }

  if (newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("client_id", clientId)
    .eq("role", "client")
    .single();

  if (!profile) return { ok: false, error: "No login found for this client." };

  const { error } = await admin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// CSV upload
// ---------------------------------------------------------------------------

export async function fetchClientLookup(): Promise<
  { id: string; business_name: string }[]
> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select("id, business_name")
    .order("business_name");
  return data ?? [];
}

export async function commitTransferUpload(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): Promise<ActionResult<{ inserted: number; skipped: number }>> {
  let adminUser;
  try {
    adminUser = await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }

  const admin = createAdminClient();
  const { data: clients } = await admin.from("clients").select("id, business_name");
  const mapped = mapCsvRows(rows, mapping, clients ?? []);

  const valid = mapped.filter((r) => r.errors.length === 0);
  const skipped = mapped.length - valid.length;

  if (valid.length === 0) {
    return { ok: false, error: "No valid rows to import. Check your column mapping." };
  }

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

  revalidatePath("/admin");
  revalidatePath("/client");
  return { ok: true, data: { inserted: valid.length, skipped } };
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export async function generateInvoiceForClient(
  clientId: string
): Promise<ActionResult<{ invoiceId: string }>> {
  let adminUser;
  try {
    adminUser = await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }

  const admin = createAdminClient();
  const { data: transfers, error: transfersError } = await admin
    .from("transfers")
    .select("*")
    .eq("client_id", clientId)
    .eq("billing_status", "billable")
    .is("invoice_id", null);

  if (transfersError) return { ok: false, error: transfersError.message };

  const draft = buildInvoiceDraft(transfers ?? []);
  if (!draft) {
    return { ok: false, error: "No billable, unbilled transfers for this client." };
  }

  const { count } = await admin
    .from("invoices")
    .select("id", { count: "exact", head: true });

  const invoiceNumber = formatInvoiceNumber(todayISO(), (count ?? 0) + 1);

  const { data: invoice, error: invoiceError } = await admin
    .from("invoices")
    .insert({
      client_id: clientId,
      invoice_number: invoiceNumber,
      period_start: draft.periodStart,
      period_end: draft.periodEnd,
      total_amount: draft.totalAmount,
      transfer_count: draft.transferCount,
      created_by: adminUser.user.id,
    })
    .select()
    .single();

  if (invoiceError || !invoice) {
    return { ok: false, error: invoiceError?.message ?? "Could not create invoice." };
  }

  const { error: updateError } = await admin
    .from("transfers")
    .update({ invoice_id: invoice.id })
    .in("id", draft.transferIds);

  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client/invoices");
  return { ok: true, data: { invoiceId: invoice.id } };
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: "generated" | "sent" | "paid"
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("invoices").update({ status }).eq("id", invoiceId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/client/invoices");
  return { ok: true, data: undefined };
}

/**
 * Marks an invoice as sent, and — if RESEND_API_KEY is configured — emails
 * the client a link to view/download it. Without that env var, the invoice
 * is still marked sent so admin can download the PDF and send it manually.
 */
export async function sendInvoiceToClient(invoiceId: string): Promise<ActionResult<{ emailed: boolean }>> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();

  const { data: invoice, error } = await admin
    .from("invoices")
    .update({ status: "sent" })
    .eq("id", invoiceId)
    .select("client_id, invoice_number")
    .single();
  if (error || !invoice) return { ok: false, error: error?.message ?? "Could not update invoice." };

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/client/invoices");

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!resendKey || !fromEmail) {
    return { ok: true, data: { emailed: false } };
  }

  const { data: client } = await admin
    .from("clients")
    .select("email, business_name")
    .eq("id", invoice.client_id)
    .maybeSingle();
  if (!client?.email) return { ok: true, data: { emailed: false } };

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: client.email,
        subject: `Invoice ${invoice.invoice_number} from Transferly`,
        html: `<p>Hi ${client.business_name},</p><p>Your invoice <strong>${invoice.invoice_number}</strong> is ready. Log in to your Transferly portal to view and download it.</p>`,
      }),
    });
    return { ok: true, data: { emailed: resp.ok } };
  } catch {
    return { ok: true, data: { emailed: false } };
  }
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------


export async function createEmployeeAccount(input: {
  full_name: string;
  email: string;
  phone: string;
  employment_type: EmploymentType;
  base_rate_pkr: string;
  bonus_tiers: BonusTier[];
  daily_cap?: string;
  notes?: string;
  password: string;
}): Promise<ActionResult<{ employeeId: string }>> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }

  const fullName = input.full_name.trim();
  const email = input.email.trim().toLowerCase();

  if (!fullName) return { ok: false, error: "Name is required." };
  if (!email) return { ok: false, error: "Email is required." };
  if (!input.password || input.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const admin = createAdminClient();

  const { data: employeeRow, error: employeeError } = await admin
    .from("employees")
    .insert({
      full_name: fullName,
      email,
      phone: input.phone.trim() || null,
      employment_type: input.employment_type,
      base_rate_pkr: Number(input.base_rate_pkr) || 0,
      bonus_tiers: input.bonus_tiers,
      daily_cap: input.daily_cap && input.daily_cap.trim() ? Number(input.daily_cap) : null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (employeeError || !employeeRow) {
    return { ok: false, error: employeeError?.message ?? "Could not create employee." };
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    await admin.from("employees").delete().eq("id", employeeRow.id);
    return { ok: false, error: authError?.message ?? "Could not create login." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    role: "employee",
    employee_id: employeeRow.id,
    full_name: fullName,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("employees").delete().eq("id", employeeRow.id);
    return { ok: false, error: profileError.message };
  }

  revalidatePath("/admin/employees");
  return { ok: true, data: { employeeId: employeeRow.id } };
}

export async function updateEmployeeStatus(
  employeeId: string,
  status: "active" | "inactive"
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("employees").update({ status }).eq("id", employeeId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${employeeId}`);
  return { ok: true, data: undefined };
}

/** Archive is a reversible soft-delete: hides the employee from active lists
 *  and blocks their login, but keeps every historical submission intact. */
export async function archiveEmployee(employeeId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("employees")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", employeeId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${employeeId}`);
  return { ok: true, data: undefined };
}

export async function restoreEmployee(employeeId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("employees").update({ archived_at: null }).eq("id", employeeId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${employeeId}`);
  return { ok: true, data: undefined };
}

export async function updateEmployeePayRules(
  employeeId: string,
  base_rate_pkr: number,
  bonus_tiers: BonusTier[]
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("employees")
    .update({ base_rate_pkr, bonus_tiers })
    .eq("id", employeeId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/employees/${employeeId}`);
  return { ok: true, data: undefined };
}

export async function resetEmployeePassword(
  employeeId: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  if (newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("role", "employee")
    .single();

  if (!profile) return { ok: false, error: "No login found for this employee." };

  const { error } = await admin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

export async function assignClientToEmployee(
  employeeId: string,
  clientId: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("employee_client_assignments")
    .insert({ employee_id: employeeId, client_id: clientId });
  if (error && !error.message.includes("duplicate")) {
    return { ok: false, error: error.message };
  }
  revalidatePath(`/admin/employees/${employeeId}`);
  return { ok: true, data: undefined };
}

export async function unassignClientFromEmployee(
  employeeId: string,
  clientId: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("employee_client_assignments")
    .delete()
    .eq("employee_id", employeeId)
    .eq("client_id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/employees/${employeeId}`);
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Employee-submitted transfer approvals
// ---------------------------------------------------------------------------

export async function approveEmployeeTransfer(transferId: string): Promise<ActionResult> {
  let adminUser;
  try {
    adminUser = await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("transfers")
    .update({
      employee_approved: true,
      employee_approved_at: new Date().toISOString(),
      employee_approved_by: adminUser.user.id,
    })
    .eq("id", transferId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/approvals");
  revalidatePath("/employee");
  return { ok: true, data: undefined };
}

export async function rejectEmployeeTransfer(transferId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();
  // Rejecting only removes payroll credit — it does not touch the transfer's
  // own accept/decline lifecycle with the insurance client, which is a
  // separate concern.
  const { error } = await admin
    .from("transfers")
    .update({ employee_approved: false, submitted_by: null })
    .eq("id", transferId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/approvals");
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Billing decision (admin side — same effect as the client's own action)
// ---------------------------------------------------------------------------

export async function adminSetTransferBilling(
  transferId: string,
  billingStatus: "billable" | "refund",
  note?: string
): Promise<ActionResult> {
  let adminUser;
  try {
    adminUser = await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  if (billingStatus === "refund" && !note?.trim()) {
    return { ok: false, error: "Please explain why this transfer is a refund." };
  }
  const admin = createAdminClient();
  const { data: row, error: fetchError } = await admin
    .from("transfers")
    .select("status")
    .eq("id", transferId)
    .maybeSingle();
  if (fetchError) return { ok: false, error: fetchError.message };
  if (!row) return { ok: false, error: "Transfer not found." };
  if (row.status !== "accepted") {
    return { ok: false, error: "Only accepted transfers can be marked billable or refund." };
  }
  const { error } = await admin
    .from("transfers")
    .update({
      billing_status: billingStatus,
      billing_note: note?.trim() || null,
      billing_decided_at: new Date().toISOString(),
      billing_decided_by: adminUser.user.id,
    })
    .eq("id", transferId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/client");
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Client operational fields (Campaign, schedule, timer, cap, cool-off, states)
// ---------------------------------------------------------------------------

export async function updateClientOperations(
  clientId: string,
  input: {
    campaign_status?: "active" | "paused";
    schedule_from?: string | null;
    schedule_to?: string | null;
    paused_until?: string | null;
    daily_cap?: number | null;
    cooloff_minutes?: number | null;
    accepted_states?: string | null;
    notes?: string | null;
  }
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("clients").update(input).eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, data: undefined };
}

export async function updateEmployeeDailyCap(
  employeeId: string,
  dailyCap: number | null
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("employees").update({ daily_cap: dailyCap }).eq("id", employeeId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${employeeId}`);
  return { ok: true, data: undefined };
}

/** Hard-deletes a single lead. Only allowed while it has never been invoiced,
 *  so billing history can never be silently erased. */
export async function deleteTransfer(transferId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }
  const admin = createAdminClient();
  const { data: transfer } = await admin
    .from("transfers")
    .select("client_id, submitted_by, invoice_id")
    .eq("id", transferId)
    .maybeSingle();
  if (!transfer) return { ok: false, error: "Lead not found." };
  if (transfer.invoice_id) {
    return { ok: false, error: "Cannot delete a lead that has already been invoiced." };
  }

  const { error } = await admin.from("transfers").delete().eq("id", transferId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${transfer.client_id}`);
  if (transfer.submitted_by) revalidatePath(`/admin/employees/${transfer.submitted_by}`);
  revalidatePath("/admin/approvals");
  revalidatePath("/client");
  revalidatePath("/employee");
  return { ok: true, data: undefined };
}
