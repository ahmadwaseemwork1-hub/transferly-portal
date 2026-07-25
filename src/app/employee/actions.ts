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
