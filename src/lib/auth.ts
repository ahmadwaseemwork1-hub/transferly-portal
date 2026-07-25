import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  // Only select what admin needs — avoids failure if employee_id column doesn't exist yet
  const { data: profile } = await supabase
    .from("profiles").select("role, client_id, full_name").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Not authorized");
  return { supabase, user, profile: { ...profile, employee_id: null as string | null } };
}

export async function requireClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase
    .from("profiles").select("role, client_id, full_name").eq("id", user.id).single();
  if (profile?.role !== "client" || !profile.client_id) throw new Error("Not authorized");
  return { supabase, user, profile: { ...profile, employee_id: null as string | null } };
}

export async function requireEmployee() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase
    .from("profiles").select("role, client_id, employee_id, full_name").eq("id", user.id).single();
  if (profile?.role !== "employee" || !profile.employee_id) throw new Error("Not authorized");
  return { supabase, user, profile };
}
