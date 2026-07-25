"use client";

import { useState } from "react";
import { updateEmployeeCap, updateEmployeeStatus, resetEmployeePassword } from "@/app/admin/actions";
import { Button, Card, CardHeader, Input, Label } from "@/components/ui";
import type { Employee } from "@/lib/types";

export function EmployeeActions({ employee }: { employee: Employee }) {
  const [cap, setCap] = useState(String(employee.daily_cap));
  const [capMsg, setCapMsg] = useState<string | null>(null);
  const [capLoading, setCapLoading] = useState(false);

  const [password, setPassword] = useState("");
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  const [statusLoading, setStatusLoading] = useState(false);

  async function saveCap() {
    setCapLoading(true); setCapMsg(null);
    const r = await updateEmployeeCap(employee.id, Number(cap));
    setCapMsg(r.ok ? "Daily cap updated!" : r.error);
    setCapLoading(false);
  }

  async function toggleStatus() {
    setStatusLoading(true);
    const newStatus = employee.status === "active" ? "paused" : "active";
    await updateEmployeeStatus(employee.id, newStatus);
    setStatusLoading(false);
    window.location.reload();
  }

  async function savePassword() {
    if (password.length < 8) { setPassMsg("Password must be at least 8 characters."); return; }
    setPassLoading(true); setPassMsg(null);
    const r = await resetEmployeePassword(employee.id, password);
    setPassMsg(r.ok ? "Password reset!" : r.error);
    if (r.ok) setPassword("");
    setPassLoading(false);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Daily cap editor */}
      <Card>
        <CardHeader title="Daily transfer cap" description="Maximum transfers this employee can log per day." />
        <div className="p-6 flex flex-col gap-3">
          <div>
            <Label>Cap (transfers/day)</Label>
            <Input type="number" min="0" value={cap} onChange={(e) => setCap(e.target.value)} />
          </div>
          <Button onClick={saveCap} disabled={capLoading}>
            {capLoading ? "Saving..." : "Update cap"}
          </Button>
          {capMsg && <p className={`text-sm ${capMsg.includes("!") ? "text-success" : "text-danger"}`}>{capMsg}</p>}
        </div>
      </Card>

      {/* Status + password */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Account status" />
          <div className="p-6">
            <Button onClick={toggleStatus} disabled={statusLoading}
              className={employee.status === "active" ? "bg-warning text-white hover:bg-warning/90" : ""}>
              {statusLoading ? "Updating..." : employee.status === "active" ? "Pause employee" : "Reactivate employee"}
            </Button>
          </div>
        </Card>
        <Card>
          <CardHeader title="Reset password" />
          <div className="p-6 flex flex-col gap-3">
            <div>
              <Label>New password</Label>
              <Input type="password" minLength={8} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>
            <Button onClick={savePassword} disabled={passLoading}>
              {passLoading ? "Resetting..." : "Reset password"}
            </Button>
            {passMsg && <p className={`text-sm ${passMsg.includes("!") ? "text-success" : "text-danger"}`}>{passMsg}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
