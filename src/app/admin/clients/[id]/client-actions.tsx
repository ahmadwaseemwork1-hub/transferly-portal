"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateClientStatus,
  resetClientPassword,
  generateInvoiceForClient,
  updateClientDetails,
  archiveClient,
  restoreClient,
} from "@/app/admin/actions";
import { Button, Input, Label, Select } from "@/components/ui";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming","Washington D.C.",
];

export function ClientDetailsEditor({
  clientId,
  initialState,
  initialRequirements,
  initialNotes,
}: {
  clientId: string;
  initialState: string;
  initialRequirements: string;
  initialNotes: string;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [requirements, setRequirements] = useState(initialRequirements);
  const [notes, setNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const result = await updateClientDetails(clientId, { state, requirements, notes });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage("Client details saved.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div>
        <Label>State</Label>
        <Select value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">— Select state —</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Lead requirements</Label>
        <textarea
          rows={5}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Describe lead quality requirements, filters, or notes for agents handling this client's transfers (e.g. 'Only send homeowners age 35-65 from Texas, no DUIs, minimum $100k coverage interest')."
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
        />
      </div>
      <div>
        <Label>Internal notes</Label>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Private notes about this client (billing terms, preferences, history, etc.)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-success">{message}</p>}
      <Button type="submit" size="sm" className="self-start" disabled={loading}>
        {loading ? "Saving..." : "Save details"}
      </Button>
    </form>
  );
}

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
