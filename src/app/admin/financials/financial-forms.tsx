"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addExpense, addRevenueEntry, setExchangeRate } from "@/app/admin/financial-actions";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { todayISO } from "@/lib/utils";
import type { Currency, Platform } from "@/lib/types";

export function ExpenseForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    category: "",
    description: "",
    amount: "",
    currency: "PKR" as Currency,
    expense_date: todayISO(),
    recurring: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await addExpense(form);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm({ ...form, category: "", description: "", amount: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label>Category</Label>
        <Input
          required
          placeholder="Office rent, payroll, software..."
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
      </div>
      <div>
        <Label>Date</Label>
        <Input
          type="date"
          required
          value={form.expense_date}
          onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
        />
      </div>
      <div>
        <Label>Amount</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          required
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
      </div>
      <div>
        <Label>Currency</Label>
        <Select
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}
        >
          <option value="PKR">PKR</option>
          <option value="USD">USD</option>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label>Description (optional)</Label>
        <Textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
        <input
          type="checkbox"
          checked={form.recurring}
          onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
        />
        This is a recurring monthly expense
      </label>
      {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
      <Button type="submit" disabled={loading} className="self-start sm:col-span-2">
        {loading ? "Adding..." : "Add expense"}
      </Button>
    </form>
  );
}

export function RevenueForm({ clients }: { clients: { id: string; business_name: string }[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    client_id: "",
    platform: "payoneer" as Platform,
    gross_amount: "",
    fee_amount: "",
    tax_amount: "",
    currency: "USD" as Currency,
    received_date: todayISO(),
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const net =
    (Number(form.gross_amount) || 0) - (Number(form.fee_amount) || 0) - (Number(form.tax_amount) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await addRevenueEntry(form);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm({ ...form, gross_amount: "", fee_amount: "", tax_amount: "", notes: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label>Client (optional)</Label>
        <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
          <option value="">Not tied to one client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.business_name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Platform</Label>
        <Select
          value={form.platform}
          onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })}
        >
          <option value="payoneer">Payoneer</option>
          <option value="paypal">PayPal</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <div>
        <Label>Date received</Label>
        <Input
          type="date"
          required
          value={form.received_date}
          onChange={(e) => setForm({ ...form, received_date: e.target.value })}
        />
      </div>
      <div>
        <Label>Currency</Label>
        <Select
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}
        >
          <option value="USD">USD</option>
          <option value="PKR">PKR</option>
        </Select>
      </div>
      <div>
        <Label>Gross amount</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          required
          value={form.gross_amount}
          onChange={(e) => setForm({ ...form, gross_amount: e.target.value })}
        />
      </div>
      <div>
        <Label>Platform fee</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={form.fee_amount}
          onChange={(e) => setForm({ ...form, fee_amount: e.target.value })}
        />
      </div>
      <div>
        <Label>Tax withheld</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={form.tax_amount}
          onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
        />
      </div>
      <div>
        <Label>Net (what hit your bank)</Label>
        <Input disabled value={net.toFixed(2)} />
      </div>
      <div className="sm:col-span-2">
        <Label>Notes (optional)</Label>
        <Textarea
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
      <Button type="submit" disabled={loading} className="self-start sm:col-span-2">
        {loading ? "Adding..." : "Add revenue entry"}
      </Button>
    </form>
  );
}

export function ExchangeRateForm({ dates }: { dates: string[] }) {
  const router = useRouter();
  const [rates, setRates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(date: string) {
    setLoading(date);
    setError(null);
    const result = await setExchangeRate(date, rates[date] ?? "");
    setLoading(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (dates.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-warning-soft p-4">
      <p className="text-sm font-medium text-warning">
        Missing exchange rate for {dates.length} date(s). Amounts on these dates are left out
        of the total below until you enter a rate.
      </p>
      {dates.map((date) => (
        <div key={date} className="flex items-center gap-2">
          <span className="w-28 text-sm text-foreground">{date}</span>
          <Input
            type="number"
            min={0}
            step="0.0001"
            placeholder="PKR per 1 USD"
            value={rates[date] ?? ""}
            onChange={(e) => setRates({ ...rates, [date]: e.target.value })}
            className="max-w-[160px]"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSave(date)}
            disabled={loading === date || !rates[date]}
          >
            {loading === date ? "Saving..." : "Save rate"}
          </Button>
        </div>
      ))}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
