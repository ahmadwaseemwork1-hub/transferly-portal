"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface EmployeeCapData {
  id: string;
  name: string;
  status: string;
  daily_cap: number;
  todayCount: number;
}

interface Props {
  initial: EmployeeCapData[];
}

export function RealtimeEmployeeCaps({ initial }: Props) {
  const [employees, setEmployees] = useState<EmployeeCapData[]>(initial);

  const refreshEmployee = useCallback(
    async (employeeId: string) => {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("employee_uploads")
        .select("transfer_count")
        .eq("employee_id", employeeId)
        .eq("upload_date", today);

      const todayCount = (data ?? []).reduce((s, r) => s + r.transfer_count, 0);
      setEmployees((prev) =>
        prev.map((e) => (e.id === employeeId ? { ...e, todayCount } : e))
      );
    },
    []
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("employee-uploads-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "employee_uploads",
        },
        (payload) => {
          const row = payload.new as {
            employee_id: string;
            transfer_count: number;
            upload_date: string;
          };
          const today = new Date().toISOString().slice(0, 10);
          if (row.upload_date === today) {
            setEmployees((prev) =>
              prev.map((e) =>
                e.id === row.employee_id
                  ? { ...e, todayCount: e.todayCount + row.transfer_count }
                  : e
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshEmployee]);

  if (employees.length === 0) return null;

  const totalToday = employees.reduce((s, e) => s + e.todayCount, 0);
  const activeCount = employees.filter((e) => e.status === "active").length;

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="font-semibold text-foreground">Team · Live cap tracker</h3>
          <p className="mt-0.5 text-xs text-muted">
            {activeCount} active · {totalToday} transfers today
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-success">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live
        </span>
      </div>

      <div className="divide-y divide-border">
        {employees.map((emp) => {
          const pct =
            emp.daily_cap > 0
              ? Math.min(100, Math.round((emp.todayCount / emp.daily_cap) * 100))
              : 0;
          const color =
            pct >= 100 ? "bg-danger" : pct >= 75 ? "bg-warning" : "bg-success";
          const textColor =
            pct >= 100
              ? "text-danger"
              : pct >= 75
              ? "text-warning"
              : "text-foreground";

          return (
            <div key={emp.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {emp.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                  <span className={cn("text-xs font-semibold tabular-nums", textColor)}>
                    {emp.todayCount}/{emp.daily_cap}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-background overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", color)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              {emp.status !== "active" && (
                <span className="text-xs text-muted">paused</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
