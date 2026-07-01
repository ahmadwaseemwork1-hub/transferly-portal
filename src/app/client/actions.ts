"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import type { ActionResult } from "@/app/admin/actions";

export async function respondToTransfer(
  transferId: string,
  status: "accepted" | "declined",
  declineReason?: string
): Promise<ActionResult> {
  let ctx;
  try {
    ctx = await requireClient();
  } catch {
    return { ok: false, error: "Not authorized." };
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
