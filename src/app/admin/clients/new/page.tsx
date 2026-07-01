"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClientAccount } from "@/app/admin/actions";
import { Button, Card, CardHeader, Input, Label } from "@/components/ui";

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    price_per_transfer: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await createClientAccount(form);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/admin/clients/${result.data.clientId}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clients
      </Link>
      <Card>
        <CardHeader
          title="Add a new client"
          description="This creates their login and their record in one step."
        />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div>
            <Label>Business name</Label>
            <Input
              required
              value={form.business_name}
              onChange={(e) => update("business_name", e.target.value)}
              placeholder="Summit Auto Insurance"
            />
          </div>
          <div>
            <Label>Contact name</Label>
            <Input
              value={form.contact_name}
              onChange={(e) => update("contact_name", e.target.value)}
              placeholder="Jordan Lee"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Email (used to log in)</Label>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="jordan@summit.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <div>
            <Label>Price per accepted transfer (optional)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.price_per_transfer}
              onChange={(e) => update("price_per_transfer", e.target.value)}
              placeholder="45.00"
            />
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="At least 8 characters"
            />
            <p className="mt-1 text-xs text-muted">
              Share this with the client directly. You can reset it later from their
              detail page.
            </p>
          </div>
          {error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Creating..." : "Create client"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
