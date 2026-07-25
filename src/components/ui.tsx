import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-sm",
        hover && "card-hover cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

const buttonVariants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md active:scale-[0.98]",
  accent: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm active:scale-[0.98]",
  outline: "border border-border bg-surface text-foreground hover:bg-primary-soft hover:border-primary/30",
  ghost: "text-foreground hover:bg-primary-soft",
  danger: "bg-danger text-white hover:bg-danger/90 shadow-sm active:scale-[0.98]",
  success: "bg-success text-white hover:bg-success/90 shadow-sm active:scale-[0.98]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        size === "sm" ? "px-3.5 py-1.5 text-sm" : size === "lg" ? "px-6 py-3 text-base" : "px-4 py-2.5 text-sm",
        buttonVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        className
      )}
    >
      {children}
    </span>
  );
}

type StatAccent = "blue" | "gold" | "green" | "red" | "neutral";

const accentStyles: Record<StatAccent, { icon: string; value: string; bar: string }> = {
  blue:    { icon: "bg-primary/10 text-primary",    value: "text-primary",    bar: "stat-accent-blue" },
  gold:    { icon: "bg-accent-soft text-accent",     value: "text-accent",     bar: "stat-accent-gold" },
  green:   { icon: "bg-success-soft text-success",   value: "text-success",    bar: "stat-accent-green" },
  red:     { icon: "bg-danger-soft text-danger",     value: "text-danger",     bar: "stat-accent-red" },
  neutral: { icon: "bg-primary-soft text-muted",     value: "text-foreground", bar: "" },
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: StatAccent;
}) {
  const styles = accentStyles[accent];
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md",
      styles.bar
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted leading-tight">{label}</p>
        {icon && (
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", styles.icon)}>
            {icon}
          </div>
        )}
      </div>
      <p className={cn("mt-3 text-3xl font-bold tracking-tight", styles.value)}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      {icon && (
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-muted">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="text-sm text-muted max-w-xs">{description}</p>}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 resize-none",
        props.className
      )}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

/** Gradient hero banner for page headers */
export function HeroBanner({
  title,
  subtitle,
  action,
  badge,
}: {
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  badge?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-8 text-primary-foreground shadow-lg">
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-accent/20" />
      <div className="pointer-events-none absolute right-20 bottom-2 h-20 w-20 rounded-full bg-white/5" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {badge && (
            <span className="mb-2 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80">
              {badge}
            </span>
          )}
          <h1 className="font-serif text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
