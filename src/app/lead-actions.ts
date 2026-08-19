"use server";

import { revalidatePath } from "next/cache";
import { requireStaff, authErrorMessage } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeDate } from "@/lib/csv";
import { todayISO } from "@/lib/utils";
import type { ActionResult } from "@/app/admin/actions";
import type { LeadExtraField } from "@/lib/types";

export async function fetchLeadFormLookup(): Promise<{
  clients: { id: string; business_name: string; campaign_status: string }[];
  employees: { id: string; full_name: string }[];
  self: { role: "admin" | "employee"; employeeId: string | null };
}> {
  const { profile } = await requireStaff();
  const admin = createAdminClient();

  const [{ data: clients }, { data: employees }] = await Promise.all([
    admin
      .from("clients")
      .select("id, business_name, campaign_status")
      .eq("status", "active")
      .is("archived_at", null)
      .order("business_name"),
    admin
      .from("employees")
      .select("id, full_name")
      .eq("status", "active")
      .is("archived_at", null)
      .order("full_name"),
  ]);

  return {
    clients: clients ?? [],
    employees: employees ?? [],
    self: {
      role: profile.role as "admin" | "employee",
      employeeId: profile.employee_id ?? null,
    },
  };
}

/**
 * The shape the (now fully editable) preview form submits. Every value is a
 * plain string because it comes straight out of text inputs — validation and
 * type coercion happens here, server-side, right before saving.
 */
export interface EditableLeadInput {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  home_status: string;
  vehicle_count: string;
  vehicles: string;
  current_carrier: string;
  policy_term: string;
  extra: LeadExtraField[];
}

export async function submitLeadTransfer(input: {
  lead: EditableLeadInput;
  clientId: string;
  agentEmployeeId: string;
  transferTime: string;
}): Promise<ActionResult<{ transferId: string }>> {
  let staff;
  try {
    staff = await requireStaff();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }

  const lead = input.lead;
  const firstName = (lead.first_name ?? "").trim();
  const lastName = (lead.last_name ?? "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const dobParsed = normalizeDate(lead.date_of_birth ?? "");
  const vehicleCountParsed = Number.parseInt((lead.vehicle_count ?? "").trim(), 10);
  const vehicleCount = Number.isFinite(vehicleCountParsed) ? vehicleCountParsed : null;

  if (!input.clientId) {
    return { ok: false, error: "Choose which client this lead is for." };
  }

  // Employees can only ever submit under their own name, regardless of what
  // the client sent — this is what makes the payroll count trustworthy.
  const agentEmployeeId =
    staff.profile.role === "employee" ? staff.profile.employee_id! : input.agentEmployeeId;

  if (!agentEmployeeId) {
    return { ok: false, error: "Choose which agent this transfer belongs to." };
  }

  const admin = createAdminClient();

  const { data: client, error: clientError } = await admin
    .from("clients")
    .select("id, price_per_transfer, campaign_status, archived_at")
    .eq("id", input.clientId)
    .maybeSingle();

  if (clientError) return { ok: false, error: clientError.message };
  if (!client || client.archived_at) {
    return { ok: false, error: "That client no longer exists." };
  }
  if (client.campaign_status === "paused") {
    return {
      ok: false,
      error: "This client's campaign is currently paused — they are not accepting calls right now.",
    };
  }

  // Employee daily submission cap, if one is set.
  if (staff.profile.role === "employee") {
    const { data: employeeRow, error: employeeError } = await admin
      .from("employees")
      .select("daily_cap")
      .eq("id", agentEmployeeId)
      .maybeSingle();
    if (employeeError) return { ok: false, error: employeeError.message };

    if (employeeRow?.daily_cap != null) {
      const { count, error: countError } = await admin
        .from("transfers")
        .select("id", { count: "exact", head: true })
        .eq("submitted_by", agentEmployeeId)
        .eq("transfer_date", todayISO());
      if (countError) return { ok: false, error: countError.message };
      if ((count ?? 0) >= employeeRow.daily_cap) {
        return {
          ok: false,
          error: `Daily cap reached (${employeeRow.daily_cap}/day). Ask an admin to raise it if you need to submit more today.`,
        };
      }
    }
  }

  // Duplicate check: same phone number already sent to this client. Logged
  // to duplicate_lead_attempts either way, so admin gets a real-time alert
  // naming the agent even when the block is correct and expected.
  const normalizedPhone = (lead.phone ?? "").trim();
  if (normalizedPhone) {
    const { data: existing, error: dupError } = await admin
      .from("transfers")
      .select("id")
      .eq("client_id", input.clientId)
      .eq("phone", normalizedPhone)
      .limit(1);
    if (dupError) return { ok: false, error: dupError.message };

    if (existing && existing.length > 0) {
      await admin.from("duplicate_lead_attempts").insert({
        client_id: input.clientId,
        employee_id: agentEmployeeId,
        phone: normalizedPhone,
      });
      return {
        ok: false,
        error: "Duplicate lead — a lead with this phone number was already sent to this client.",
      };
    }
  }

  const { data: transfer, error } = await admin
    .from("transfers")
    .insert({
      client_id: input.clientId,
      transfer_date: todayISO(),
      transfer_time: input.transferTime || null,
      lead_name: fullName,
      phone: (lead.phone ?? "").trim() || null,
      state: (lead.state ?? "").trim() || null,
      insurance_type: "Auto",
      value: client.price_per_transfer ?? 0,
      status: "pending",
      date_of_birth: dobParsed,
      email: (lead.email ?? "").trim() || null,
      address: (lead.address ?? "").trim() || null,
      city: (lead.city ?? "").trim() || null,
      zip_code: (lead.zip_code ?? "").trim() || null,
      home_status: (lead.home_status ?? "").trim() || null,
      vehicle_count: vehicleCount,
      vehicles: (lead.vehicles ?? "").trim() || null,
      current_carrier: (lead.current_carrier ?? "").trim() || null,
      policy_term: (lead.policy_term ?? "").trim() || null,
      lead_extra: lead.extra ?? [],
      submitted_by: agentEmployeeId,
      employee_approved: false,
      created_by: staff.user.id,
    })
    .select()
    .single();

  if (error || !transfer) {
    return { ok: false, error: error?.message ?? "Could not save the transfer." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/approvals");
  revalidatePath("/employee");
  revalidatePath("/client");

  return { ok: true, data: { transferId: transfer.id } };
}
