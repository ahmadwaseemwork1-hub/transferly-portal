"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Transfer } from "@/lib/types";
import { PendingTransferCard } from "@/app/client/transfer-actions";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  initialPending: Transfer[];
  clientId: string;
}

export function RealtimePendingTransfers({ initialPending, clientId }: Props) {
  const [pending, setPending] = useState<Transfer[]>(initialPending);
  const [newCount, setNewCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const prevCountRef = useRef(initialPending.length);
  const audioRef = useRef<AudioContext | null>(null);

  // When the server refreshes after accept/decline, sync state.
  // Merge: keep any realtime-only IDs that aren't in the new server list yet,
  // but honour removals (accepted/declined transfers disappear from server list).
  useEffect(() => {
    setPending((prev) => {
      const serverIds = new Set(initialPending.map((t) => t.id));
      // Keep realtime-added items that server hasn't delivered yet
      const realtimeOnly = prev.filter((t) => !serverIds.has(t.id));
      return [...initialPending, ...realtimeOnly];
    });
  }, [initialPending]);

  // Subtle chime when new transfer arrives
  const playChime = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio not available — silently skip
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`client-transfers-${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transfers",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const newTransfer = payload.new as Transfer;
          if (newTransfer.status === "pending") {
            setPending((prev) => [newTransfer, ...prev]);
            setNewCount((c) => c + 1);
            setShowBanner(true);
            playChime();
            // Auto-hide banner after 5 seconds
            setTimeout(() => setShowBanner(false), 5000);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transfers",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const updated = payload.new as Transfer;
          // Remove from pending if accepted or declined
          if (updated.status !== "pending") {
            setPending((prev) => prev.filter((t) => t.id !== updated.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, playChime]);

  // Track new arrivals for badge
  useEffect(() => {
    if (pending.length > prevCountRef.current) {
      prevCountRef.current = pending.length;
    }
  }, [pending.length]);

  const clearNew = () => {
    setNewCount(0);
    setShowBanner(false);
  };

  return (
    <div>
      {/* New transfer notification banner */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-500 ease-in-out",
          showBanner ? "max-h-20 mb-4" : "max-h-0 mb-0"
        )}
      >
        <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success-soft px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
            </span>
            <Bell className="h-4 w-4 text-success" />
            <p className="text-sm font-semibold text-success">
              {newCount} new transfer{newCount !== 1 ? "s" : ""} arrived — review below
            </p>
          </div>
          <button
            onClick={clearNew}
            className="text-xs font-medium text-success/70 hover:text-success"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Pending list header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Pending review
        </h2>
        {pending.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning ring-1 ring-warning/30">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
            </span>
            {pending.length} pending
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface/50 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
            <svg className="h-6 w-6 text-success" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">All caught up!</p>
          <p className="mt-1 text-xs text-muted">New transfers will appear here in real time.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((transfer, i) => (
            <div
              key={transfer.id}
              className={cn(
                "transition-all duration-300",
                i === 0 && newCount > 0 ? "ring-2 ring-success/40 rounded-xl" : ""
              )}
            >
              <PendingTransferCard transfer={transfer} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
