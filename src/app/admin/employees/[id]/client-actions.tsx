"use client";

import { useState } from "react";
import {
  updateEmployeeCap,
  updateEmployeeStatus,
  updateEmployeePkrRate,
  resetEmployeePassword,
  archiveEmployee,
  restoreEmployee,
} from "@/app/admin/actions";
import { Button, Card, CardHeader, Input, Label } from "@/components/ui";
import type { Employee } from "@/lib/types";

export function EmployeeActions({ employee }: { employee: Employee }) {
  const [cap, setCap] = useState(String(employee.daily_cap));
  const [capMsg, setCapMsg] = useState<string | null>(null);
  const [capLoading, setCapLoading] = useState(false);

  const [rate, setRate] = useState(String(employee.pkr_rate_per_transfer));
  const [rateMsg, setRateMsg] = useState<string | null>(null);
  const [rateLoading, setRateLoading] = useState(false);

  const [password, setPassword] = useState("");
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  const [statusLoading, setStatusLoading] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  async function saveCap() {
    setCapLoading(true); setCapMsg(null);
    const r = await updateEmployeeCap(employee.id, Number(cap));
    setCapMsg(r.ok ? "Daily cap updated!" : r.error);
    setCapLoading(false);
  }

  async function saveRate() {
    setRateLoading(true); setRateMsg(null);
    const r = await updateEmployeePkrRate(employee.id, Number(rate));
    setRateMsg(r.ok ? "PKR rate updated!" : r.error);
    setRateLoading(false);
  }

  async function toggleStatus() {
    setStatusLoading(true);
    const newStatus = employee.status === "active" ? "paused" : "active";
    await updateEmployeeStatus(employee.id, newStatus);
    setStatusLoading(false);
    window.location.reload();
  }

  async function handleArchiveToggle() {
    setArchiveLoading(true);
    if (employee.archived_at) {
      await restoreEmployee(employee.id);
    } else {
      await archiveEmployee(employee.id);
    }
    setArchiveLoading(false);
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

      {/* PKR rate editor */}
      <Card>
        <CardHeader title="PKR pay rate" description="What this employee earns per lead submitted (regardless of accept/decline)." />
        <div className="p-6 flex flex-col gap-3">
          <div>
            <Label>Rs. per transfer</Label>
            <Input type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <Button onClick={saveRate} disabled={rateLoading}>
            {rateLoading ? "Saving..." : "Update rate"}
          </Button>
          {rateMsg && <p className={`text-sm ${rateMsg.includes("!") ? "text-success" : "text-danger"}`}>{rateMsg}</p>}
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
        <Card>
          <CardHeader title={employee.archived_at ? "Restore employee" : "Archive employee"}
            description={employee.archived_at
              ? "This employee is archived — they cannot log in. Restoring brings them back to the active list."
              : "Archiving blocks their login and hides them from active lists, but keeps all their submitted leads."} />
          <div className="p-6">
            {!confirmingArchive ? (
              <Button variant="danger" onClick={() => setConfirmingArchive(true)} disabled={archiveLoading}>
                {employee.archived_at ? "Restore employee" : "Archive employee"}
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-foreground">
                  {employee.archived_at
                    ? "Restore this employee's access?"
                    : "Are you sure? They will no longer be able to log in."}
                </p>
                <div className="flex gap-2">
                  <Button variant="danger" onClick={handleArchiveToggle} disabled={archiveLoading}>
                    {archiveLoading ? "Working..." : "Confirm"}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmingArchive(false)} disabled={archiveLoading}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
