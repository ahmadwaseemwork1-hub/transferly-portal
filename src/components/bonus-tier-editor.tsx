"use client";

import { Plus, Trash2 } from "lucide-react";
import type { BonusTier } from "@/lib/types";
import { Button, Input, Label } from "@/components/ui";

export function BonusTierEditor({
  tiers,
  onChange,
}: {
  tiers: BonusTier[];
  onChange: (tiers: BonusTier[]) => void;
}) {
  function update(index: number, field: keyof BonusTier, value: number) {
    const next = tiers.slice();
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }

  function remove(index: number) {
    onChange(tiers.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...tiers, { min_transfers: 0, flat_amount: 0 }]);
  }

  return (
    <div className="flex flex-col gap-3">
      <Label>Daily bonus tiers (optional)</Label>
      <p className="-mt-1 text-xs text-muted">
        At or above this many transfers in a day, pay becomes this flat amount instead
        of the per-transfer rate. Leave empty if this employee is paid per-transfer only.
      </p>
      {tiers.map((tier, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              type="number"
              min={1}
              placeholder="Min. transfers"
              value={tier.min_transfers || ""}
              onChange={(e) => update(i, "min_transfers", Number(e.target.value))}
            />
          </div>
          <span className="text-sm text-muted">→</span>
          <div className="flex-1">
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Flat amount (PKR)"
              value={tier.flat_amount || ""}
              onChange={(e) => update(i, "flat_amount", Number(e.target.value))}
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger"
            aria-label="Remove tier"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="self-start">
        <Plus className="h-4 w-4" />
        Add tier
      </Button>
    </div>
  );
}
