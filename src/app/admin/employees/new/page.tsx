"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createEmployeeAccount } from "@/app/admin/actions";
import { Button, Card, CardHeader, Input, Label } from "@/components/ui";

export default function NewEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", daily_cap: "10", password: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await createEmployeeAccount(form);
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    router.push(`/admin/employees/${result.data.employeeId}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/admin/employees" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to employees
      </Link>
      <Card>
        <CardHeader title="Add a new employee" description="Creates their login and sets their daily transfer cap." />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div>
            <Label>Full name *</Label>
            <Input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Sarah Ahmed" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Email (login) *</Label>
              <Input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="sarah@yourcompany.com" />
            </div>
            <div>
              <Label>Daily cap *</Label>
              <Input type="number" required min="0" value={form.daily_cap} onChange={(e) => update("daily_cap", e.target.value)} placeholder="10" />
              <p className="mt-1 text-xs text-muted">Max transfers they can upload per day</p>
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Any notes about this employee" />
          </div>
          <div>
            <Label>Temporary password *</Label>
            <Input required minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="At least 8 characters" />
            <p className="mt-1 text-xs text-muted">Share directly with the employee. Reset anytime.</p>
          </div>
          {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Creating..." : "Create employee"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
