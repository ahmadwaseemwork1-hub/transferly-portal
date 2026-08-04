import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { computeEmployeePayroll } from "@/lib/payroll";
import { sumInCurrency, type CurrencyLineItem } from "@/lib/currency";
import { getPeriodRange, PERIOD_LABELS, type PeriodKey } from "@/lib/period";
import { todayISO, cn } from "@/lib/utils";
import type { Employee, Transfer, Expense, RevenueEntry, ExchangeRate, Currency, Client } from "@/lib/types";
import { ExpenseForm, RevenueForm, ExchangeRateForm } from "./financial-forms";

const PERIODS: PeriodKey[] = ["today", "week", "month", "6months", "year"];

function fmt(amount: number, currency: Currency): string {
  const symbol = currency === "USD" ? "$" : "₨";
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; currency?: string }>;
}) {
  const { period: periodParam, currency: currencyParam } = await searchParams;
  const period: PeriodKey = PERIODS.includes(periodParam as PeriodKey)
    ? (periodParam as PeriodKey)
    : "month";
  const currency: Currency = currencyParam === "USD" ? "USD" : "PKR";
  const range = getPeriodRange(period, todayISO());

  const supabase = await createClient();

  const [
    { data: transfers },
    { data: employees },
    { data: expensesData },
    { data: revenueData },
    { data: ratesData },
    { data: clientsData },
  ] = await Promise.all([
    supabase
      .from("transfers")
      .select("*")
      .gte("transfer_date", range.start)
      .lte("transfer_date", range.end),
    supabase.from("employees").select("*"),
    supabase
      .from("expenses")
      .select("*")
      .gte("expense_date", range.start)
      .lte("expense_date", range.end),
    supabase
      .from("revenue_entries")
      .select("*")
      .gte("received_date", range.start)
      .lte("received_date", range.end),
    supabase.from("exchange_rates").select("*"),
    supabase.from("clients").select("id, business_name").eq("status", "active").order("business_name"),
  ]);

  const transferList = (transfers ?? []) as Transfer[];
  const employeeList = (employees ?? []) as Employee[];
  const expenseList = (expensesData ?? []) as Expense[];
  const revenueList = (revenueData ?? []) as RevenueEntry[];
  const rates = (ratesData ?? []) as ExchangeRate[];
  const clients = (clientsData ?? []) as Pick<Client, "id" | "business_name">[];

  // Billable: automatic, computed straight from accepted transfers x their
  // client's rate. Always USD-denominated at the source.
  const billableItems: CurrencyLineItem[] = transferList
    .filter((t) => t.billing_status === "billable")
    .map((t) => ({ date: t.transfer_date, amount: Number(t.value) || 0, currency: "USD" }));

  // Actual: what really landed in the bank, net of platform fees/taxes.
  const actualItems: CurrencyLineItem[] = revenueList.map((r) => ({
    date: r.received_date,
    amount: r.net_amount,
    currency: r.currency,
  }));

  const expenseItems: CurrencyLineItem[] = expenseList.map((e) => ({
    date: e.expense_date,
    amount: e.amount,
    currency: e.currency,
  }));

  // Payroll is always computed in PKR from each employee's approved
  // transfers within this range, then folded into the same conversion pass.
  const payrollItems: CurrencyLineItem[] = employeeList.flatMap((employee) => {
    const theirTransfers = transferList.filter((t) => t.submitted_by === employee.id);
    const payroll = computeEmployeePayroll(
      employee.base_rate_pkr,
      employee.bonus_tiers ?? [],
      theirTransfers
    );
    return payroll.byDate.map((d) => ({ date: d.date, amount: d.amountPkr, currency: "PKR" as Currency }));
  });

  const billable = sumInCurrency(billableItems, currency, rates);
  const actual = sumInCurrency(actualItems, currency, rates);
  const expensesTotal = sumInCurrency(expenseItems, currency, rates);
  const payrollTotal = sumInCurrency(payrollItems, currency, rates);

  const missingDates = Array.from(
    new Set([
      ...billable.missingDates,
      ...actual.missingDates,
      ...expensesTotal.missingDates,
      ...payrollTotal.missingDates,
    ])
  ).sort();

  const netProfit =
    Math.round((actual.total - expensesTotal.total - payrollTotal.total) * 100) / 100;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Financials</h1>
        <p className="mt-1 text-sm text-muted">Admin only. Billable, actual, expenses, payroll.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/admin/financials?period=${p}&currency=${currency}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                p === period
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary-soft text-primary hover:bg-primary/10"
              )}
            >
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          {(["PKR", "USD"] as Currency[]).map((c) => (
            <Link
              key={c}
              href={`/admin/financials?period=${period}&currency=${c}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                c === currency
                  ? "bg-accent text-accent-foreground"
                  : "bg-accent-soft text-accent hover:bg-accent/10"
              )}
            >
              {c}
            </Link>
          ))}
        </div>
      </div>

      <ExchangeRateForm dates={missingDates} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Billable (automatic)" value={fmt(billable.total, currency)} hint="Billable transfers x rate" />
        <StatCard label="Actual received (net)" value={fmt(actual.total, currency)} hint="After platform fees & tax" />
        <StatCard label="Expenses + payroll" value={fmt(expensesTotal.total + payrollTotal.total, currency)} />
        <StatCard label="Net profit" value={fmt(netProfit, currency)} hint="Actual − expenses − payroll" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Expenses" value={fmt(expensesTotal.total, currency)} />
        <StatCard label="Payroll" value={fmt(payrollTotal.total, currency)} />
      </div>

      <Card>
        <CardHeader title="Log actual revenue" description="What landed in the bank, net of fees & tax." />
        <div className="p-6">
          <RevenueForm clients={clients} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Log an expense" />
        <div className="p-6">
          <ExpenseForm />
        </div>
      </Card>

      <Card>
        <CardHeader title="Recent revenue entries" />
        {revenueList.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">None logged for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Platform</th>
                  <th className="px-4 py-3 font-medium">Gross</th>
                  <th className="px-4 py-3 font-medium">Fee</th>
                  <th className="px-4 py-3 font-medium">Tax</th>
                  <th className="px-4 py-3 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {revenueList.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-6 py-3 text-foreground">{r.received_date}</td>
                    <td className="px-4 py-3 text-muted capitalize">{r.platform.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-foreground">{fmt(r.gross_amount, r.currency)}</td>
                    <td className="px-4 py-3 text-muted">{fmt(r.fee_amount, r.currency)}</td>
                    <td className="px-4 py-3 text-muted">{fmt(r.tax_amount, r.currency)}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{fmt(r.net_amount, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Recent expenses" />
        {expenseList.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">None logged for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Recurring</th>
                </tr>
              </thead>
              <tbody>
                {expenseList.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-6 py-3 text-foreground">{e.expense_date}</td>
                    <td className="px-4 py-3 text-foreground">{e.category}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{fmt(e.amount, e.currency)}</td>
                    <td className="px-4 py-3 text-muted">{e.recurring ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
