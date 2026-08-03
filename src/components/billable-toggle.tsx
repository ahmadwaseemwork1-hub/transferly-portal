"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTransferBillable } from "@/app/actions/transfer-billable";
import { Button, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

export function BillableToggle({
  transferId,
  billable,
  note,
}: {
  transferId: string;
  billable: boolean;
  note: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftBillable, setDraftBillable] = useState(billable);
  const [draftNote, setDraftNote] = useState(note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!draftBillable && !draftNote.trim()) {
      setError("Please explain why this transfer is non-billable.");
      return;
    }
    setSaving(true);
    setError(null);
    const r = await updateTransferBillable(transferId, draftBillable, draftNote);
    setSaving(false);
    if (!r.ok) { setError(r.error); return; }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          onClick={() => { setEditing(true); setDraftBillable(billable); setDraftNote(note ?? ""); }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            billable ? "bg-success-soft text-success hover:bg-success-soft/70" : "bg-danger-soft text-danger hover:bg-danger-soft/70"
          )}
        >
          {billable ? "Billable" : "Non-billable"}
        </button>
        {!billable && note && <p className="max-w-[16rem] text-xs text-muted">{note}</p>}
      </div>
    );
  }

  return (
    <div className="flex w-56 flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex gap-1.5">
        <button
          onClick={() => setDraftBillable(true)}
          className={cn(
            "flex-1 rounded-full px-2 py-1 text-xs font-medium",
            draftBillable ? "bg-success text-white" : "bg-background text-muted border border-border"
          )}
        >
          Billable
        </button>
        <button
          onClick={() => setDraftBillable(false)}
          className={cn(
            "flex-1 rounded-full px-2 py-1 text-xs font-medium",
            !draftBillable ? "bg-danger text-white" : "bg-background text-muted border border-border"
          )}
        >
          Non-billable
        </button>
      </div>
      {!draftBillable && (
        <Textarea
          rows={2}
          value={draftNote}
          onChange={(e) => setDraftNote(e.target.value)}
          placeholder="Why is this non-billable?"
          className="text-xs"
        />
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-1.5">
        <Button size="sm" onClick={save} disabled={saving} className="flex-1 py-1 text-xs">
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="flex-1 py-1 text-xs">
          Cancel
        </Button>
      </div>
    </div>
  );
}
