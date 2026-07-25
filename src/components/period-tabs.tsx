"use client";

import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PERIODS = [
  { key: "1d", label: "Today" },
  { key: "1w", label: "1 Week" },
  { key: "1m", label: "1 Month" },
  { key: "6m", label: "6 Months" },
  { key: "1y", label: "1 Year" },
];

export function PeriodTabs({ activePeriod }: { activePeriod: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => router.push(`${pathname}?period=${p.key}`)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activePeriod === p.key
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted hover:bg-primary-soft hover:text-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
