"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateClientStatus,
  resetClientPassword,
  generateInvoiceForClient,
  updateClientOperations,
  adminSetTransferBilling,
  archiveClient,
  restoreClient,
} from "@/app/admin/actions";
import { updateClientRate } from "@/app/admin/financial-actions";
import { Button, Badge, Input, Label, Select, Textarea } from "@/components/ui";

export function StatusToggle({
  clientId,
  status,
}: {
  clientId: string;
  status: "active" | "paused";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await updateClientStatus(clientId, status === "active" ? "paused" : "active");
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={loading}>
      {status === "active" ? "Pause client" : "Reactivate client"}
    </Button>
  );
}

export function ArchiveClientControl({
  clientId,
  archivedAt,
}: {
  clientId: string;
  archivedAt: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    if (archivedAt) {
      await restoreClient(clientId);
    } else {
      await archiveClient(clientId);
    }
    setLoading(false);
    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button variant="danger" size="sm" onClick={() => setConfirming(true)} disabled={loading}>
        {archivedAt ? "Restore client" : "Archive client"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-foreground">
        {archivedAt ? "Restore this client?" : "Archive? They can't log in until restored."}
      </span>
      <Button variant="danger" size="sm" onClick={handleToggle} disabled={loading}>
        {loading ? "Working..." : "Confirm"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={loading}>
        Cancel
      </Button>
    </div>
  );
}

export function ResetPasswordForm({ clientId }: { clientId: string }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const result = await resetClientPassword(clientId, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage("Password updated. Share the new password with the client.");
    setPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <Label>New password</Label>
        <Input
          type="text"
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

export function GenerateInvoiceButton({
  clientId,
  disabled,
}: {
  clientId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const result = await generateInvoiceForClient(clientId);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/admin/invoices?highlight=${result.data.invoiceId}`);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleClick} disabled={disabled || loading} variant="accent" size="sm">
        {loading ? "Generating..." : "Generate invoice"}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function RateEditor({
  clientId,
  initialRate,
}: {
  clientId: string;
  initialRate: number | null;
}) {
  const router = useRouter();
  const [rate, setRate] = useState(initialRate != null ? String(initialRate) : "");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    setMessage(null);
    const result = await updateClientRate(clientId, rate);
    setLoading(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage("Saved. New transfers for this client will use this rate.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
      <div className="max-w-[200px]">
        <Label>Price per accepted transfer (USD)</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
      </div>
      <Button variant="outline" size="sm" onClick={handleSave} disabled={loading}>
        {loading ? "Saving..." : "Save rate"}
      </Button>
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}

export function ClientOperationsPanel({
  clientId,
  initial,
}: {
  clientId: string;
  initial: {
    campaign_status: "active" | "paused";
    schedule_from: string | null;
    schedule_to: string | null;
    paused_until: string | null;
    daily_cap: number | null;
    cooloff_minutes: number | null;
    accepted_states: string | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    campaign_status: initial.campaign_status,
    schedule_from: initial.schedule_from ?? "",
    schedule_to: initial.schedule_to ?? "",
    paused_until: initial.paused_until ? initial.paused_until.slice(0, 16) : "",
    daily_cap: initial.daily_cap != null ? String(initial.daily_cap) : "",
    cooloff_minutes: initial.cooloff_minutes != null ? String(initial.cooloff_minutes) : "",
    accepted_states: initial.accepted_states ?? "",
    notes: initial.notes ?? "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setLoading(true);
    setMessage(null);
    const result = await updateClientOperations(clientId, {
      campaign_status: form.campaign_status,
      schedule_from: form.schedule_from || null,
      schedule_to: form.schedule_to || null,
      paused_until: form.paused_until ? new Date(form.paused_until).toISOString() : null,
      daily_cap: form.daily_cap.trim() ? Number(form.daily_cap) : null,
      cooloff_minutes: form.cooloff_minutes.trim() ? Number(form.cooloff_minutes) : null,
      accepted_states: form.accepted_states.trim() || null,
      notes: form.notes.trim() || null,
    });
    setLoading(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage("Saved.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Campaign</p>
          <Select
            value={form.campaign_status}
            onChange={(e) => update("campaign_status", e.target.value as "active" | "paused")}
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </Select>
          <p className="mt-1 text-xs text-muted">
            Also self-toggled by the client. "Agent" status below mirrors this.
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Agent</p>
          <div className="flex h-[42px] items-center">
            <Badge
              className={
                form.campaign_status === "active"
                  ? "bg-success-soft text-success"
                  : "bg-neutral-100 text-muted"
              }
            >
              {form.campaign_status === "active" ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Schedule info
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={form.schedule_from}
              onChange={(e) => update("schedule_from", e.target.value)}
            />
            <span className="text-sm text-muted">to</span>
            <Input
              type="time"
              value={form.schedule_to}
              onChange={(e) => update("schedule_to", e.target.value)}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Timer info</p>
          <Input
            type="datetime-local"
            value={form.paused_until}
            onChange={(e) => update("paused_until", e.target.value)}
          />
          <p className="mt-1 text-xs text-muted">Pause until (optional)</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Cap info</p>
          <Input
            type="number"
            min={0}
            value={form.daily_cap}
            onChange={(e) => update("daily_cap", e.target.value)}
            placeholder="Daily cap (blank = no limit)"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Transfer info
          </p>
          <Input
            type="number"
            min={0}
            value={form.cooloff_minutes}
            onChange={(e) => update("cooloff_minutes", e.target.value)}
            placeholder="Cool-off minutes between transfers"
          />
        </div>

        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Extra info
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              value={form.accepted_states}
              onChange={(e) => update("accepted_states", e.target.value)}
              placeholder="Accepted states (e.g. FL, GA, TX)"
            />
            <Input
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Notes"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
        {message && <p className="text-sm text-muted">{message}</p>}
      </div>
    </div>
  );
}

interface BillingDecisionTransfer {
  id: string;
  lead_name: string | null;
  transfer_date: string;
  value: number;
  billing_status: "billable" | "refund" | null;
  billing_note: string | null;
}

function BillingDecisionRow({ transfer: t }: { transfer: BillingDecisionTransfer }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"billable" | "refund" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRefundNote, setShowRefundNote] = useState(false);
  const [note, setNote] = useState(t.billing_note ?? "");

  async function decide(status: "billable" | "refund", noteValue?: string) {
    if (status === "refund" && !noteValue?.trim()) {
      setError("Please explain why this transfer is a refund.");
      setShowRefundNote(true);
      return;
    }
    setLoading(status);
    setError(null);
    const result = await adminSetTransferBilling(t.id, status, noteValue);
    setLoading(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setShowRefundNote(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{t.lead_name ?? "Unnamed lead"}</p>
          <p className="text-xs text-muted">
            {t.transfer_date} · {t.value}
            {t.billing_status && ` · currently ${t.billing_status}`}
          </p>
          {t.billing_status === "refund" && t.billing_note && (
            <p className="text-xs text-muted">Reason: {t.billing_note}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="success"
            size="sm"
            onClick={() => decide("billable")}
            disabled={loading !== null}
          >
            {loading === "billable" ? "Saving..." : "Billable"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRefundNote(true)}
            disabled={loading !== null}
          >
            {loading === "refund" ? "Saving..." : "Refund"}
          </Button>
        </div>
      </div>
      {showRefundNote && (
        <div className="flex flex-col gap-2 rounded-lg bg-danger-soft/40 p-3">
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why is this a refund?"
          />
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={() => decide("refund", note)} disabled={loading !== null}>
              Confirm refund
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowRefundNote(false)} disabled={loading !== null}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function AdminBillingDecisionList({
  transfers,
}: {
  transfers: BillingDecisionTransfer[];
}) {
  if (transfers.length === 0) {
    return <p className="px-6 py-8 text-center text-sm text-muted">Nothing awaiting a billing decision.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {transfers.map((t) => (
        <BillingDecisionRow key={t.id} transfer={t} />
      ))}
    </div>
  );
}
