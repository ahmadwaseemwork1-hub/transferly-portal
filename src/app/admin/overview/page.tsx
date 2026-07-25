import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, StatCard, HeroBanner } from "@/components/ui";
import { FilterableTransferTable } from "@/components/filterable-transfer-table";
import { PeriodTabs } from "@/components/period-tabs";
import { OverviewCharts } from "@/components/overview-charts";
import { PrintButton } from "@/components/print-button";
import { ClearDataButton } from "@/components/clear-data-button";
import { RealtimeEmployeeCaps } from "@/components/realtime-employee-caps";
import { formatCurrency, formatCurrencyPKR, todayISO } from "@/lib/utils";
import { getPkrRate } from "@/lib/pkr-rate";
import { parseISODate } from "@/lib/stats";
import type { Client, Employee, EmployeeUpload, Transfer } from "@/lib/types";
import type { DayBar } from "@/components/overview-charts";

type Period = "1d" | "1w" | "1m" | "6m" | "1y";

function getPeriodStart(today: string, period: Period): string {
  const d = parseISODate(today);
  switch (period) {
    case "1d": return today;
    case "1w": { const w = new Date(d); w.setDate(d.getDate() - 6); return w.toISOString().slice(0, 10); }
    case "1m": { const m = new Date(d); m.setDate(d.getDate() - 29); return m.toISOString().slice(0, 10); }
    case "6m": { const s = new Date(d); s.setDate(d.getDate() - 179); return s.toISOString().slice(0, 10); }
    case "1y": { const y = new Date(d); y.setDate(d.getDate() - 364); return y.toISOString().slice(0, 10); }
  }
}

function periodLabel(period: Period): string {
  return { "1d": "Today", "1w": "Last 7 days", "1m": "Last 30 days", "6m": "Last 6 months", "1y": "Last year" }[period];
}

function buildBars(transfers: Transfer[], start: string, today: string, period: Period): DayBar[] {
  const startDate = parseISODate(start);
  const endDate = parseISODate(today);
  const msPerDay = 86400000;

  if (period === "1y") {
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const grouped = new Map<string, DayBar>();
    months.forEach((m) => {
      const short = new Date(m + "-01").toLocaleDateString("en-US", { month: "short" });
      grouped.set(m, { date: m, label: short, total: 0, accepted: 0, pending: 0, declined: 0, value: 0 });
    });
    for (const t of transfers) {
      const monthKey = t.transfer_date.slice(0, 7);
      const entry = grouped.get(monthKey);
      if (entry) {
        entry.total++;
        if (t.status === "accepted") { entry.accepted++; entry.value += Number(t.value) || 0; }
        else if (t.status === "pending") entry.pending++;
        else entry.declined++;
      }
    }
    return [...grouped.values()];
  }

  if (period === "6m") {
    const weeks: string[] = [];
    const cur = new Date(startDate);
    const dayOfWeek = cur.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    cur.setDate(cur.getDate() + diffToMon);
    while (cur <= endDate) {
      weeks.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 7);
    }
    const grouped = new Map<string, DayBar>();
    weeks.forEach((w) => {
      const d = parseISODate(w);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      grouped.set(w, { date: w, label, total: 0, accepted: 0, pending: 0, declined: 0, value: 0 });
    });
    for (const t of transfers) {
      let best = weeks[0];
      for (const w of weeks) {
        if (w <= t.transfer_date) best = w;
        else break;
      }
      const entry = grouped.get(best);
      if (entry) {
        entry.total++;
        if (t.status === "accepted") { entry.accepted++; entry.value += Number(t.value) || 0; }
        else if (t.status === "pending") entry.pending++;
        else entry.declined++;
      }
    }
    return [...grouped.values()];
  }

  const map = new Map<string, DayBar>();
  const days = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime() + i * msPerDay);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    map.set(iso, { date: iso, label, total: 0, accepted: 0, pending: 0, declined: 0, value: 0 });
  }
  for (const t of transfers) {
    const entry = map.get(t.transfer_date);
    if (entry) {
      entry.total++;
      if (t.status === "accepted") { entry.accepted++; entry.value += Number(t.value) || 0; }
      else if (t.status === "pending") entry.pending++;
      else entry.declined++;
    }
  }
  return [...map.values()];
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = (params.period as Period) ?? "1m";
  const today = todayISO();
  const rangeStart = getPeriodStart(today, period);

  const supabase = await createClient();

  const [{ data: clients }, { data: transfers }, pkrRate, { data: employees }, { data: uploads }] = await Promise.all([
    supabase.from("clients").select("id, business_name"),
    supabase.from("transfers").select("*").gte("transfer_date", rangeStart).order("transfer_date", { ascending: true }),
    getPkrRate(),
    supabase.from("employees").select("*").order("name"),
    supabase.from("employee_uploads").select("employee_id, transfer_count, upload_date").eq("upload_date", today),
  ]);

  const clientList = (clients ?? []) as Pick<Client, "id" | "business_name">[];
  const empList = (employees ?? []) as Employee[];
  const uploadList = (uploads ?? []) as Pick<EmployeeUpload, "employee_id" | "transfer_count" | "upload_date">[];
  const employeeCapData = empList.map((e) => ({
    id: e.id,
    name: e.name,
    status: e.status,
    daily_cap: e.daily_cap,
    todayCount: uploadList.filter((u) => u.employee_id === e.id).reduce((s, u) => s + u.transfer_count, 0),
  }));
  const transferList = (transfers ?? []) as Transfer[];

  let totalPeriod = 0, acceptedPeriod = 0, pendingPeriod = 0, declinedPeriod = 0, totalValue = 0, creditPending = 0;
  for (const t of transferList) {
    totalPeriod++;
    if (t.status === "accepted") { acceptedPeriod++; totalValue += Number(t.value) || 0; }
    else if (t.status === "pending") pendingPeriod++;
    else declinedPeriod++;
    if (t.status === "accepted" && !t.invoice_id) creditPending += Number(t.value) || 0;
  }

  const bars = buildBars(transferList, rangeStart, today, period);
  const clientNames = Object.fromEntries(clientList.map((c) => [c.id, c.business_name]));
  const recent = [...transferList].reverse().slice(0, 20);
  const acceptRate = totalPeriod > 0 ? Math.round((acceptedPeriod / totalPeriod) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 print:gap-4">

      {/* Hero banner */}
      <HeroBanner
        title="My Progress"
        subtitle={`${periodLabel(period)} · ${transferList.length} transfers · Live rate ₨${pkrRate.toFixed(2)}/USD`}
        badge="Owner Dashboard"
        action={
          <div className="flex items-center gap-2 print:hidden">
            <PrintButton />
            <ClearDataButton />
          </div>
        }
      />

      {/* Period selector */}
      <div className="print:hidden">
        <PeriodTabs activePeriod={period} />
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Transfers"
          value={totalPeriod}
          hint={periodLabel(period)}
          accent="blue"
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          }
        />
        <StatCard
          label="Accepted"
          value={acceptedPeriod}
          hint={`${acceptRate}% acceptance rate`}
          accent="green"
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Pending"
          value={pendingPeriod}
          hint={declinedPeriod > 0 ? `${declinedPeriod} declined` : "Awaiting response"}
          accent={pendingPeriod > 0 ? "gold" : "neutral"}
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Credit Pending"
          value={formatCurrency(creditPending)}
          hint={`≈ ${formatCurrencyPKR(creditPending, pkrRate)} PKR`}
          accent="gold"
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Charts */}
      <OverviewCharts
        bars={bars}
        totalAccepted={acceptedPeriod}
        totalPending={pendingPeriod}
        totalDeclined={declinedPeriod}
        acceptedValueUSD={totalValue}
        pkrRate={pkrRate}
        period={period}
      />

      {/* Financial model */}
      <Card>
        <CardHeader
          title="Financial Model — PKR / USD"
          description="Accepted revenue this period converted at the live exchange rate."
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {[
            { label: "Revenue (USD)", value: formatCurrency(totalValue), sub: null, highlight: true },
            { label: "Revenue (PKR)", value: formatCurrencyPKR(totalValue, pkrRate), sub: null, highlight: true },
            { label: "Unbilled (Credit Pending)", value: formatCurrency(creditPending), sub: `≈ ${formatCurrencyPKR(creditPending, pkrRate)}`, highlight: false },
            { label: "Live Exchange Rate", value: `₨ ${pkrRate.toFixed(2)}`, sub: "1 USD · updates hourly", highlight: false },
          ].map(({ label, value, sub, highlight }) => (
            <div key={label} className="bg-surface px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
              <p className={`mt-2 text-2xl font-bold ${highlight ? "text-accent" : "text-foreground"}`}>{value}</p>
              {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
            </div>
          ))}
        </div>
      </Card>

      {/* Live employee caps */}
      {employeeCapData.length > 0 && (
        <div className="print:hidden">
          <RealtimeEmployeeCaps initial={employeeCapData} />
        </div>
      )}

      {/* Activity log */}
      <Card>
        <CardHeader
          title="Activity Log"
          description={`Most recent ${Math.min(recent.length, 20)} transfers in this period — searchable`}
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <FilterableTransferTable transfers={recent} showClient clientNames={clientNames} />
      </Card>
    </div>
  );
}
