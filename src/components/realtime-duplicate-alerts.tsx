"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, X } from "lucide-react";

interface DuplicateLeadAttempt {
  id: string;
  client_id: string | null;
  employee_id: string | null;
  phone: string | null;
  attempted_at: string;
}

interface Alert {
  id: string;
  employeeName: string;
  clientName: string;
  phone: string | null;
}

export function RealtimeDuplicateAlerts({
  employeeNames,
  clientNames,
}: {
  employeeNames: Record<string, string>;
  clientNames: Record<string, string>;
}) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-duplicate-lead-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "duplicate_lead_attempts" },
        (payload) => {
          const row = payload.new as DuplicateLeadAttempt;
          const alert: Alert = {
            id: row.id,
            employeeName: (row.employee_id && employeeNames[row.employee_id]) || "Unknown agent",
            clientName: (row.client_id && clientNames[row.client_id]) || "Unknown client",
            phone: row.phone,
          };
          setAlerts((prev) => [alert, ...prev]);
          setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
          }, 15000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeNames, clientNames]);

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm font-medium text-foreground">
              Duplicate lead attempt by <strong>{a.employeeName}</strong> for <strong>{a.clientName}</strong>
              {a.phone && <> · {a.phone}</>}
            </p>
          </div>
          <button
            onClick={() => setAlerts((prev) => prev.filter((x) => x.id !== a.id))}
            className="text-warning/70 hover:text-warning"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
