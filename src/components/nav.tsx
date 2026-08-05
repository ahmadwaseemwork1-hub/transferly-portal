"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { VoxpactLogo } from "@/components/logo";

export interface NavLinkItem {
  href: string;
  label: string;
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
    <header className="no-print sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <span className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight text-primary">
            <VoxpactLogo className="h-6 w-6 shrink-0 text-primary" />
            {brand}
          </span>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/admin" && link.href !== "/client" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted hover:bg-primary-soft hover:text-primary"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {userLabel && <span className="text-sm text-muted">{userLabel}</span>}
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-primary-soft hover:text-primary"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        <button
          className="rounded-lg p-2 text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-primary-soft text-primary"
                    : "text-muted hover:bg-primary-soft hover:text-primary"
                )}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted hover:bg-primary-soft hover:text-primary"
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
