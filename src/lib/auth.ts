import { createClient } from "@/lib/supabase/server";

/** Throws if there is no logged-in admin. Use at the top of every admin server action. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");

  return { supabase, user, profile };
}

/** Throws if there is no logged-in client user. Returns their client_id. */
export async function requireClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "client" || !profile.client_id) {
    throw new Error("Not authorized");
  }

  return { supabase, user, profile };
}
