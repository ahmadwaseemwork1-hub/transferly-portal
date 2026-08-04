import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Visit /api/health after deploying to check, in plain English, whether
 * your environment variables are set and whether the app can actually
 * reach your Supabase database and read the expected tables. This never
 * returns secret values — only whether they're present and whether the
 * connection works.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: url ? "set" : "MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? "set" : "MISSING",
    SUPABASE_SERVICE_ROLE_KEY: serviceKey ? "set" : "MISSING",
  };

  if (!url || !anonKey) {
    return NextResponse.json(
      {
        ok: false,
        step: "environment_variables",
        envCheck,
        message:
          "One or more environment variables are missing. Set them in Vercel " +
          "under Project Settings > Environment Variables, then redeploy.",
      },
      { status: 500 }
    );
  }

  const supabase = createClient(url, anonKey);

  const { error: schemaError, count } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true });

  if (schemaError) {
    return NextResponse.json(
      {
        ok: false,
        step: "database_connection",
        envCheck,
        message:
          "Could not query the 'clients' table. This usually means either " +
          "the schema hasn't been run yet (see SETUP.md step 2) or the " +
          "Supabase URL/key don't match your project.",
        supabaseError: schemaError.message,
      },
      { status: 500 }
    );
  }

  let adminCheck: { ok: boolean; message: string } = {
    ok: false,
    message: "SUPABASE_SERVICE_ROLE_KEY not set — admin actions (creating clients, " +
      "uploading CSVs, generating invoices) will fail until it is.",
  };

  if (serviceKey) {
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: adminError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    adminCheck = adminError
      ? { ok: false, message: `Service role key set, but query failed: ${adminError.message}` }
      : { ok: true, message: "Service role key works." };
  }

  return NextResponse.json({
    ok: !schemaError && adminCheck.ok,
    envCheck,
    database: {
      ok: true,
      message: `Connected. 'clients' table is reachable (${count ?? 0} client(s) found).`,
    },
    adminConnection: adminCheck,
  });
}
