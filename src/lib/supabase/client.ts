"use client";

import { createBrowserClient } from "@supabase/ssr";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

/**
 * `rememberMe` only matters at sign-in, since that's the only time a fresh
 * session cookie is written pre-refresh: true persists the session cookie for
 * 30 days, false/omitted leaves it a browser-session-only cookie (cleared
 * when the browser closes).
 */
export function createClient(options?: { rememberMe?: boolean }) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options?.rememberMe ? { cookieOptions: { maxAge: THIRTY_DAYS } } : undefined
  );
}
