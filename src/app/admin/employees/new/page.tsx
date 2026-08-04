"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createEmployeeAccount } from "@/app/admin/actions";
import { Button, Card, CardHeader, Input, Label, Select, Textarea } from "@/components/ui";
import { BonusTierEditor } from "@/components/bonus-tier-editor";
import type { BonusTier, EmploymentType } from "@/lib/types";

export default function NewEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    employment_type: "remote" as EmploymentType,
    base_rate_pkr: "",
    daily_cap: "",
    notes: "",
    password: "",
  });
  const [tiers, setTiers] = useState<BonusTier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await createEmployeeAccount({ ...form, bonus_tiers: tiers });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/admin/employees/${result.data.employeeId}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/admin/employees"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to employees
      </Link>
      <Card>
        <CardHeader title="Add a new employee" description="Creates their login too." />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div>
            <Label>Full name</Label>
            <Input
              required
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
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
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Employment type</Label>
            <Select
              value={form.employment_type}
              onChange={(e) => update("employment_type", e.target.value as EmploymentType)}
            >
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
              <option value="part_time">Part-time</option>
            </Select>
          </div>
          <div>
            <Label>Base rate per transfer (PKR)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.base_rate_pkr}
              onChange={(e) => update("base_rate_pkr", e.target.value)}
              placeholder="1000"
            />
          </div>
          <BonusTierEditor tiers={tiers} onChange={setTiers} />
          <div>
            <Label>Daily cap (max transfers they can upload per day)</Label>
            <Input
              type="number"
              min={0}
              value={form.daily_cap}
              onChange={(e) => update("daily_cap", e.target.value)}
              placeholder="Leave blank for no limit"
            />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Anything worth remembering about this employee"
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
          </div>
          {error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
          )}
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Creating..." : "Create employee"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
