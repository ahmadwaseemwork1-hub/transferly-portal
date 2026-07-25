"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { clearAllTransfers } from "@/app/admin/actions";

export function ClearDataButton() {
  const [step, setStep] = useState<"idle" | "confirm" | "done">("idle");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleClear() {
    startTransition(async () => {
      const res = await clearAllTransfers();
      if (res.ok) {
        setResult(`Deleted ${res.data.deleted} transfers.`);
        setStep("done");
      } else {
        setResult(res.error);
        setStep("idle");
      }
    });
  }

  if (step === "done") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-success bg-success-soft px-4 py-2 text-sm text-success">
        <Trash2 className="h-4 w-4" />
        {result}
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-danger bg-danger-soft px-4 py-2">
        <p className="text-sm font-medium text-danger flex-1">
          This permanently deletes ALL transfer records. Cannot be undone.
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={handleClear}
          disabled={pending}
        >
          {pending ? "Deleting…" : "Yes, delete all"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep("idle")}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setStep("confirm")}
      className="border-danger text-danger hover:bg-danger-soft"
    >
      <Trash2 className="h-4 w-4" />
      Clear all entries
    </Button>
  );
}
