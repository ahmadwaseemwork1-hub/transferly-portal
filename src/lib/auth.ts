import { createClient } from "@/lib/supabase/server";

/**
 * Thrown by every requireX() below. Carries a specific, user-safe message so
 * server actions can show the real reason a check failed (not logged in vs.
 * profile lookup failed vs. wrong role) instead of a single opaque
 * "Not authorized." string that's impossible to debug from a screenshot.
 */
export class AuthError extends Error {}

/** Throws if there is no logged-in admin. Use at the top of every admin server action. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new AuthError(`Session check failed: ${userError.message}. Please log out and back in.`);
  }
  if (!user) {
    throw new AuthError("You're not logged in. Please log in again.");
  }

  // maybeSingle (not single): a missing/duplicate row must not throw here —
  // it must surface as a specific, readable message instead of the generic
  // "Not authorized." that made this exact bug impossible to diagnose.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, client_id, employee_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new AuthError(`Could not verify your account: ${profileError.message}`);
  }
  if (!profile) {
    throw new AuthError(
      "No account record was found for your login. Ask an admin to check your profile row in Supabase."
    );
  }
  if (profile.role !== "admin") {
    throw new AuthError(`Your account is registered as "${profile.role}", not admin.`);
  }

  return { supabase, user, profile };
}

/** Throws if there is no logged-in client user. Returns their client_id. */
export async function requireClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new AuthError(`Session check failed: ${userError.message}. Please log out and back in.`);
  }
  if (!user) {
    throw new AuthError("You're not logged in. Please log in again.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, client_id, employee_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new AuthError(`Could not verify your account: ${profileError.message}`);
  }
  if (!profile || profile.role !== "client" || !profile.client_id) {
    throw new AuthError("Your account isn't set up as a client login.");
  }

  return { supabase, user, profile };
}

/** Throws if there is no logged-in employee. Returns their employee_id. */
export async function requireEmployee() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new AuthError(`Session check failed: ${userError.message}. Please log out and back in.`);
  }
  if (!user) {
    throw new AuthError("You're not logged in. Please log in again.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, client_id, employee_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new AuthError(`Could not verify your account: ${profileError.message}`);
  }
  if (!profile || profile.role !== "employee" || !profile.employee_id) {
    throw new AuthError("Your account isn't set up as an employee login.");
  }

  return { supabase, user, profile };
}

/**
 * Throws unless the caller is an admin or an employee. Used by actions both
 * roles can perform (like submitting a lead transfer), where the action
 * itself narrows behavior based on which one it actually is.
 */
export async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new AuthError(`Session check failed: ${userError.message}. Please log out and back in.`);
  }
  if (!user) {
    throw new AuthError("You're not logged in. Please log in again.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, client_id, employee_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new AuthError(`Could not verify your account: ${profileError.message}`);
  }
  if (!profile || (profile.role !== "admin" && profile.role !== "employee")) {
    throw new AuthError("Your account isn't set up as staff (admin or employee).");
  }

  return { supabase, user, profile };
}

/** Turns any thrown auth error into a safe, specific message for an ActionResult. */
export function authErrorMessage(err: unknown): string {
  if (err instanceof AuthError) return err.message;
  return "Something unexpected went wrong verifying your session. Please refresh and try again.";
}
