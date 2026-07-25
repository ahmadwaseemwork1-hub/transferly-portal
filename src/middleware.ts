import { NextResponse, type NextRequest } from "next/server";

// Pure cookie-based auth guard — zero network calls, zero 504 timeouts.
// Edge Runtime cannot make reliable outbound HTTP calls to Supabase, so this
// middleware only checks for the presence of the auth cookie.  Full session
// validation and role enforcement happen in admin/layout.tsx and
// client/layout.tsx, which run in the Node.js runtime where network calls work.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/employee");

  if (!isProtected) return NextResponse.next();

  // Supabase stores the session cookie as:  sb-<project-ref>-auth-token
  // Large JWTs are split: sb-<ref>-auth-token.0, sb-<ref>-auth-token.1, …
  const PROJECT_REF = "lfogwnkjherbjtysnzhx";
  const AUTH_COOKIE_PREFIX = `sb-${PROJECT_REF}-auth-token`;

  const hasSession = request.cookies
    .getAll()
    .some(
      (c) =>
        c.name === AUTH_COOKIE_PREFIX ||
        c.name.startsWith(`${AUTH_COOKIE_PREFIX}.`)
    );

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/client/:path*", "/employee/:path*"],
};
