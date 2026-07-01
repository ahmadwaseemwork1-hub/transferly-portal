// One-time script to create the first admin login.
// Usage:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/create-admin.mjs admin@yourcompany.com "SomeStrongPassword123"
//
// Run this from your own computer (with Node installed) after setting up
// Supabase — see SETUP.md. It talks directly to your Supabase project.

import { createClient } from "@supabase/supabase-js";

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> "<password>"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as environment variables first."
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error || !data.user) {
  console.error("Failed to create user:", error?.message);
  process.exit(1);
}

const { error: profileError } = await admin.from("profiles").insert({
  id: data.user.id,
  role: "admin",
  full_name: "Admin",
});

if (profileError) {
  console.error("User created, but failed to set admin role:", profileError.message);
  console.error(`You can fix this manually in the Supabase table editor for user id: ${data.user.id}`);
  process.exit(1);
}

console.log(`Admin account created for ${email}. You can now log in at /login.`);
