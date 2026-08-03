"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/admin/actions";

/**
 * Sets billable/non-billable + note on a transfer. Callable by the owning
 * client OR an admin — fine-grained authorization is enforced inside the
 * `set_transfer_billable` SECURITY DEFINER RPC (supabase/migration_v2.sql),
 * so this action only needs to confirm *someone* is logged in.
 */
export async function updateTransferBillable(
  transferId: string,
  billable: boolean,
  note?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authorized." };

  const { error } = await supabase.rpc("set_transfer_billable", {
    p_transfer_id: transferId,
    p_billable: billable,
    p_note: note?.trim() || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/client");
  revalidatePath("/client/history");
  revalidatePath("/admin");
  return { ok: true, data: undefined };
}
