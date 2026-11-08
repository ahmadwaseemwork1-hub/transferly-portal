import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "pending" | "danger";

/**
 * Soft tinted background + dark text keeps every pairing above WCAG AA
 * (roughly 7:1 or better); the saturated brand colour is only used for the
 * decorative dot, never for text.
 */
const TONES: Record<StatusTone, { badge: string; dot: string }> = {
  // Active / Paid / Success
  success: {
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
    dot: "bg-[#22C55E]",
  },
  // Pending / Processing / Grace period
  pending: {
    badge: "bg-amber-50 text-amber-900 ring-amber-600/25",
    dot: "bg-[#F59E0B]",
  },
  // Inactive / Overdue / Unpaid
  danger: {
    badge: "bg-rose-50 text-rose-800 ring-rose-600/20",
    dot: "bg-[#EF4444]",
  },
};

export interface StatusBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  tone: StatusTone;
  /** The status text. Always shown, so meaning never depends on colour alone. */
  children: ReactNode;
  /** Trailing decorative dot. Hidden from assistive tech. */
  showDot?: boolean;
}

export function StatusBadge({ tone, children, showDot = true, className, ...rest }: StatusBadgeProps) {
  const styles = TONES[tone];
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        styles.badge,
        className
      )}
    >
      {children}
      {showDot && <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />}
    </span>
  );
}

// Order matters: "inactive" contains "active" and "unpaid" contains "paid",
// so the red words are checked first.
const DANGER_WORDS = ["inactive", "unpaid", "overdue", "paused", "declined", "refund", "failed", "offline"];
const PENDING_WORDS = ["pending", "processing", "grace", "awaiting", "trial"];
const SUCCESS_WORDS = ["active", "paid", "success", "online", "billable", "accepted", "approved"];

/** Maps a free-form status string from the database to a badge tone. */
export function toneForStatus(status: string | null | undefined): StatusTone {
  const s = (status ?? "").toLowerCase();
  if (DANGER_WORDS.some((w) => s.includes(w))) return "danger";
  if (PENDING_WORDS.some((w) => s.includes(w))) return "pending";
  if (SUCCESS_WORDS.some((w) => s.includes(w))) return "success";
  return "pending";
}
