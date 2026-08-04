"use server";

import { revalidatePath } from "next/cache";
import { requireClient, authErrorMessage } from "@/lib/auth";
import type { ActionResult } from "@/app/admin/actions";

export async function respondToTransfer(
  transferId: string,
  status: "accepted" | "declined",
  declineReason?: string
): Promise<ActionResult> {
  let ctx;
  try {
    ctx = await requireClient();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }

  const { error } = await ctx.supabase.rpc("respond_to_transfer", {
    p_transfer_id: transferId,
    p_status: status,
    p_decline_reason: declineReason ?? null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/client");
  revalidatePath("/client/history");
  revalidatePath("/admin");
  return { ok: true, data: undefined };
}

/**
 * Second-stage decision, only valid on an already-accepted transfer: once
 * the call has ended, mark it billable (counts toward what's owed) or
 * refund (doesn't). Both admin and client can call this — the RPC checks
 * that whoever's calling either owns the transfer's client or is an admin.
 * Editable any time before it's invoiced, not just once — a note is
 * required when marking refund, explaining why.
 */
export async function setTransferBilling(
  transferId: string,
  billingStatus: "billable" | "refund",
  note?: string
): Promise<ActionResult> {
  let ctx;
  try {
    ctx = await requireClient();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }

  const { error } = await ctx.supabase.rpc("set_transfer_billing", {
    p_transfer_id: transferId,
    p_billing_status: billingStatus,
    p_note: note?.trim() || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/client");
  revalidatePath("/client/history");
  revalidatePath("/admin");
  return { ok: true, data: undefined };
}

/** Client self-service toggle — tells employees whether calls are being taken right now. */
export async function toggleCampaignStatus(nextStatus: "active" | "paused"): Promise<ActionResult> {
  let ctx;
  try {
    ctx = await requireClient();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }

  const { error } = await ctx.supabase
    .from("clients")
    .update({ campaign_status: nextStatus })
    .eq("id", ctx.profile.client_id!);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/client");
  revalidatePath("/admin");
  return { ok: true, data: undefined };
}
