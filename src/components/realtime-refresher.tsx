"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Postgres changes on a table (optionally filtered to one
 * column/value) and refreshes the current Server Component tree whenever a
 * row changes. This is what makes a lead land on the client's (or
 * employee's) screen the instant it's submitted, without a manual reload.
 *
 * Renders nothing — it's a side-effect-only component, mounted once per
 * layout so every page under it stays live. Pass no filter to subscribe to
 * the whole table (used for the admin views).
 */
export function RealtimeRefresher({
  table,
  filterColumn,
  filterValue,
}: {
  table: string;
  filterColumn?: string;
  filterValue?: string;
}) {
  const router = useRouter();
  const hasFilter = Boolean(filterColumn && filterValue);

  useEffect(() => {
    if (filterColumn && !filterValue) return;
    const supabase = createClient();
    const channelName = hasFilter
      ? `realtime-${table}-${filterColumn}-${filterValue}`
      : `realtime-${table}-all`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        hasFilter
          ? {
              event: "*",
              schema: "public",
              table,
              filter: `${filterColumn}=eq.${filterValue}`,
            }
          : { event: "*", schema: "public", table },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filterColumn, filterValue, hasFilter, router]);

  return null;
}
