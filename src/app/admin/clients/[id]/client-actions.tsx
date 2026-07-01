"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateClientStatus,
  resetClientPassword,
  generateInvoiceForClient,
} from "@/app/admin/actions";
import { Button, Input, Label } from "@/components/ui";

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
