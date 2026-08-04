"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  updateEmployeeStatus,
  updateEmployeePayRules,
  resetEmployeePassword,
  assignClientToEmployee,
  unassignClientFromEmployee,
} from "@/app/admin/actions";
import { Button, Input, Label, Select } from "@/components/ui";
import { BonusTierEditor } from "@/components/bonus-tier-editor";
import type { BonusTier } from "@/lib/types";

export function StatusToggle({
  employeeId,
  status,
}: {
  employeeId: string;
  status: "active" | "inactive";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await updateEmployeeStatus(employeeId, status === "active" ? "inactive" : "active");
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={loading}>
      {status === "active" ? "Mark inactive" : "Reactivate"}
    </Button>
  );
}

export function ResetPasswordForm({ employeeId }: { employeeId: string }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const result = await resetEmployeePassword(employeeId, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage("Password updated.");
    setPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <Label>New password</Label>
        <Input
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-success">{message}</p>}
      <Button type="submit" variant="outline" size="sm" disabled={loading} className="self-start">
        {loading ? "Updating..." : "Reset password"}
      </Button>
    </form>
  );
}

export function PayRulesForm({
  employeeId,
  initialRate,
  initialTiers,
}: {
  employeeId: string;
  initialRate: number;
  initialTiers: BonusTier[];
}) {
  const router = useRouter();
  const [rate, setRate] = useState(String(initialRate));
  const [tiers, setTiers] = useState<BonusTier[]>(initialTiers);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    setMessage(null);
    const result = await updateEmployeePayRules(employeeId, Number(rate) || 0, tiers);
    setLoading(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage("Saved.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Base rate per transfer (PKR)</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
      </div>
      <BonusTierEditor tiers={tiers} onChange={setTiers} />
      {message && <p className="text-sm text-muted">{message}</p>}
      <Button variant="outline" size="sm" onClick={handleSave} disabled={loading} className="self-start">
        {loading ? "Saving..." : "Save pay rules"}
      </Button>
    </div>
  );
}

export function ClientAssignments({
  employeeId,
  allClients,
  assignedClientIds,
}: {
  employeeId: string;
  allClients: { id: string; business_name: string }[];
  assignedClientIds: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  const assigned = allClients.filter((c) => assignedClientIds.includes(c.id));
  const unassigned = allClients.filter((c) => !assignedClientIds.includes(c.id));

  async function handleAssign() {
    if (!selected) return;
    setLoading(true);
    await assignClientToEmployee(employeeId, selected);
    setLoading(false);
    setSelected("");
    router.refresh();
  }

  async function handleRemove(clientId: string) {
    setLoading(true);
    await unassignClientFromEmployee(employeeId, clientId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {assigned.length === 0 && <p className="text-sm text-muted">No clients assigned yet.</p>}
        {assigned.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm text-primary"
          >
            {c.business_name}
            <button onClick={() => handleRemove(c.id)} disabled={loading} aria-label="Remove">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      {unassigned.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="max-w-xs">
            <option value="">Add a client...</option>
            {unassigned.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name}
              </option>
            ))}
          </Select>
          <Button variant="outline" size="sm" onClick={handleAssign} disabled={!selected || loading}>
            Assign
          </Button>
        </div>
      )}
    </div>
  );
}
