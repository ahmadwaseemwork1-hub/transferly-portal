"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface NavLinkItem {
  href: string;
  label: string;
}

function VoxpactLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M5 8L14 4L23 8V16L14 24L5 16V8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
      <path d="M14 4V24M5 8L14 16L23 8" stroke="#b8860b" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function Avatar({ name }: { name?: string }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ring-2 ring-primary-soft">
      {initials}
    </div>
  );
}

export function AppNav({
  brand,
  links,
  userLabel,
}: {
  brand: string;
  links: NavLinkItem[];
  userLabel?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="no-print sticky top-0 z-40 border-b border-border/60 bg-surface/95 backdrop-blur-md">
      {/* Top accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-primary via-primary/80 to-accent" />

      <div className="mx-auto flex h-15 max-w-6xl items-center justify-between px-4 sm:px-6" style={{ height: "60px" }}>
        {/* Logo + nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-serif text-lg font-semibold tracking-tight text-primary hover:opacity-80 transition-opacity">
            <VoxpactLogo />
            {brand}
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/admin" && link.href !== "/client" && link.href !== "/employee" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-all",
                    active
                      ? "text-primary"
                      : "text-muted hover:text-foreground hover:bg-primary-soft"
                  )}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User area */}
        <div className="hidden items-center gap-2 md:flex">
          {userLabel && (
            <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-sm">
              <Avatar name={userLabel} />
              <span className="max-w-[120px] truncate font-medium text-foreground">{userLabel}</span>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-primary-soft hover:text-danger"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="rounded-xl border border-border p-2 text-foreground transition-colors hover:bg-primary-soft md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-surface px-4 pb-5 md:hidden">
          <nav className="flex flex-col gap-1 pt-3">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted hover:bg-primary-soft hover:text-primary"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}

            {userLabel && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2">
                <Avatar name={userLabel} />
                <span className="text-sm font-medium text-foreground">{userLabel}</span>
              </div>
            )}

            <button
              onClick={handleSignOut}
              className="mt-1 flex items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-muted hover:bg-danger-soft hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
