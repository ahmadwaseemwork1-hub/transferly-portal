"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { respondToTransfer } from "@/app/client/actions";
import { Button, Card, Textarea } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { LeadDetails } from "@/components/lead-details";
import type { Transfer } from "@/lib/types";

const DECLINE_REASONS = [
  "Call ended before connecting",
  "Lead unresponsive / no answer",
  "Wrong state / not licensed there",
  "Duplicate lead",
  "Not a qualified lead",
  "Other",
];

export function PendingTransferCard({ transfer }: { transfer: Transfer }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [reason, setReason] = useState(DECLINE_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading("accept");
    setError(null);
    const result = await respondToTransfer(transfer.id, "accepted");
    setLoading(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDecline() {
    const finalReason = reason === "Other" ? customReason.trim() : reason;
    if (!finalReason) {
      setError("Please provide a reason.");
      return;
    }
    setLoading("decline");
    setError(null);
    const result = await respondToTransfer(transfer.id, "declined", finalReason);
    setLoading(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {formatDate(transfer.transfer_date)}
          {transfer.transfer_time && ` · ${transfer.transfer_time}`}
        </p>
        <p className="text-lg font-semibold text-primary">{formatCurrency(transfer.value)}</p>
      </div>
      <div className="mt-3 rounded-lg bg-background/60 p-3">
        <LeadDetails transfer={transfer} />
      </div>

      {!showDecline ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="success"
            size="sm"
            onClick={handleAccept}
            disabled={loading !== null}
          >
            <CheckCircle2 className="h-4 w-4" />
            {loading === "accept" ? "Accepting..." : "Accept"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDecline(true)}
            disabled={loading !== null}
          >
            <XCircle className="h-4 w-4" />
            Decline
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 rounded-lg bg-danger-soft/40 p-4">
          <p className="text-sm font-medium text-foreground">Why are you declining?</p>
          <div className="flex flex-wrap gap-2">
            {DECLINE_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                  (reason === r
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted hover:border-primary")
                }
              >
                {r}
              </button>
            ))}
          </div>
          {reason === "Other" && (
            <Textarea
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Tell us what happened..."
            />
          )}
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleDecline}
              disabled={loading !== null}
            >
              {loading === "decline" ? "Submitting..." : "Confirm decline"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDecline(false)}
              disabled={loading !== null}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}
