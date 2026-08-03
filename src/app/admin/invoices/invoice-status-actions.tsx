"use client";

import { useState, useTransition } from "react";
import { updateInvoiceStatus, sendInvoiceToClient } from "@/app/admin/actions";
import { Button } from "@/components/ui";
import { CheckCircle, Send, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function InvoiceStatusButton({
  invoiceId,
  currentStatus,
}: {
  invoiceId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const advance = () => {
    if (status === "generated") {
      setError(null);
      setNote(null);
      startTransition(async () => {
        const r = await sendInvoiceToClient(invoiceId);
        if (r.ok) {
          setStatus("sent");
          setNote(r.data.emailed ? "Emailed to client." : "Marked sent — configure RESEND_API_KEY + RESEND_FROM_EMAIL to auto-email clients.");
        } else {
          setError(r.error);
        }
      });
      return;
    }

    if (status !== "sent") return;
    setError(null);
    startTransition(async () => {
      const r = await updateInvoiceStatus(invoiceId, "paid");
      if (r.ok) {
        setStatus("paid");
      } else {
        setError(r.error);
      }
    });
  };

  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
        <CheckCircle className="h-3.5 w-3.5" />
        Paid
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
          status === "sent"
            ? "bg-accent-soft text-accent"
            : "bg-neutral-100 text-muted"
        )}
      >
        {status === "sent" ? (
          <Send className="h-3.5 w-3.5" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5" />
        )}
        {status}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={advance}
        disabled={isPending}
        className="text-xs"
      >
        {isPending
          ? "Updating…"
          : status === "generated"
          ? "Send to client"
          : "Mark paid"}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}
