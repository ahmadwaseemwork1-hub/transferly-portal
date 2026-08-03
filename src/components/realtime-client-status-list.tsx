"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ClientLookupForEmployee } from "@/app/employee/actions";

interface Props {
  clients: ClientLookupForEmployee[];
  onChange: (updater: (prev: ClientLookupForEmployee[]) => ClientLookupForEmployee[]) => void;
}

/**
 * Live active/paused indicator for clients, so employees never submit a lead
 * to a just-paused client. Fully controlled — the parent owns the list (it
 * already fetches it), this just patches it in place from realtime events.
 */
export function RealtimeClientStatusList({ clients, onChange }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("employee-client-status-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "clients" },
        (payload) => {
          const updated = payload.new as { id: string; status: string; business_name: string; archived_at: string | null };
          onChangeRef.current((prev) => {
            if (updated.archived_at) return prev.filter((c) => c.id !== updated.id);
            return prev.map((c) => (c.id === updated.id ? { ...c, status: updated.status } : c));
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Client status</p>
        <span className="flex items-center gap-1.5 text-xs font-medium text-success">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live
        </span>
      </div>
      <div className="max-h-48 divide-y divide-border overflow-y-auto">
        {clients.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="text-foreground">{c.business_name}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                c.status === "active" ? "text-success" : "text-danger"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", c.status === "active" ? "bg-success" : "bg-danger")} />
              {c.status === "active" ? "Active" : "Paused"}
            </span>
          </div>
        ))}
        {clients.length === 0 && <p className="px-4 py-3 text-sm text-muted">No clients yet.</p>}
      </div>
    </div>
  );
}
