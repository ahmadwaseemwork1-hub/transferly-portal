"use client";

import { useCallback } from "react";
import { Card, CardHeader } from "@/components/ui";

export interface DayBar {
  date: string;
  label: string;
  total: number;
  accepted: number;
  pending: number;
  declined: number;
  value: number;
}

interface OverviewChartsProps {
  bars: DayBar[];
  totalAccepted: number;
  totalPending: number;
  totalDeclined: number;
  acceptedValueUSD: number;
  pkrRate: number;
  period: string;
}

function BarChart({ bars }: { bars: DayBar[] }) {
  const max = Math.max(...bars.map((b) => b.total), 1);
  const H = 120;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${Math.max(bars.length * 32, 300)} ${H + 40}`}
        className="w-full"
        style={{ minWidth: bars.length > 10 ? bars.length * 28 : undefined }}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = H - frac * H;
          return (
            <line
              key={frac}
              x1="0"
              y1={y}
              x2={bars.length * 32}
              y2={y}
              stroke="#e4e7ec"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}

        {bars.map((b, i) => {
          const barW = 20;
          const gap = 32;
          const x = i * gap + gap / 2 - barW / 2;

          const totalH = Math.round((b.total / max) * H);
          const accH = Math.round((b.accepted / max) * H);
          const pendH = Math.round((b.pending / max) * H);

          return (
            <g key={b.date}>
              {/* Full bar (total, light) */}
              {b.total > 0 && (
                <rect
                  x={x}
                  y={H - totalH}
                  width={barW}
                  height={totalH}
                  fill="#eef2f7"
                  rx="3"
                />
              )}
              {/* Accepted (green) */}
              {b.accepted > 0 && (
                <rect
                  x={x}
                  y={H - accH}
                  width={barW}
                  height={accH}
                  fill="#067647"
                  rx="3"
                />
              )}
              {/* Pending stacked on accepted (amber) */}
              {b.pending > 0 && (
                <rect
                  x={x}
                  y={H - accH - pendH}
                  width={barW}
                  height={pendH}
                  fill="#b54708"
                  rx="3"
                />
              )}
              {/* Count label */}
              {b.total > 0 && (
                <text
                  x={x + barW / 2}
                  y={H - totalH - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#667085"
                >
                  {b.total}
                </text>
              )}
              {/* Date label */}
              <text
                x={x + barW / 2}
                y={H + 16}
                textAnchor="middle"
                fontSize="9"
                fill="#667085"
              >
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-success" />
          Accepted
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-warning" />
          Pending
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary-soft border border-border" />
          Declined
        </span>
      </div>
    </div>
  );
}

function DonutChart({
  accepted,
  pending,
  declined,
}: {
  accepted: number;
  pending: number;
  declined: number;
}) {
  const total = accepted + pending + declined;
  if (total === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted">
        No data for this period
      </div>
    );
  }

  const R = 48;
  const cx = 60;
  const cy = 60;
  const stroke = 18;

  function arc(startPct: number, endPct: number, color: string, key: string) {
    if (startPct === endPct) return null;
    const startAngle = startPct * 2 * Math.PI - Math.PI / 2;
    const endAngle = endPct * 2 * Math.PI - Math.PI / 2;
    const largeArc = endPct - startPct > 0.5 ? 1 : 0;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    return (
      <path
        key={key}
        d={`M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    );
  }

  const accPct = accepted / total;
  const pendPct = pending / total;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0">
        {arc(0, accPct, "#067647", "acc")}
        {arc(accPct, accPct + pendPct, "#b54708", "pend")}
        {arc(accPct + pendPct, 1, "#b42318", "dec")}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="700" fill="#101828">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#667085">
          total
        </text>
      </svg>
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-success shrink-0" />
          <span className="text-muted">Accepted</span>
          <span className="ml-auto font-semibold text-foreground">{accepted}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-warning shrink-0" />
          <span className="text-muted">Pending</span>
          <span className="ml-auto font-semibold text-foreground">{pending}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-danger shrink-0" />
          <span className="text-muted">Declined</span>
          <span className="ml-auto font-semibold text-foreground">{declined}</span>
        </div>
      </div>
    </div>
  );
}

function ValueLineChart({ bars }: { bars: DayBar[] }) {
  if (bars.length === 0) return null;
  const values = bars.map((b) => b.value);
  const max = Math.max(...values, 1);
  const W = 300;
  const H = 80;
  const pts = bars.map((b, i) => {
    const x = bars.length > 1 ? (i / (bars.length - 1)) * W : W / 2;
    const y = H - (b.value / max) * H;
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const area = `M ${pts[0]} L ${pts.join(" L ")} L ${bars.length > 1 ? W : W / 2},${H} L 0,${H} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full">
        <defs>
          <linearGradient id="val-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b8860b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#b8860b" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={area} fill="url(#val-grad)" />
        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#b8860b" strokeWidth="2" strokeLinejoin="round" />
        {/* Dots */}
        {bars.map((b, i) => {
          const x = bars.length > 1 ? (i / (bars.length - 1)) * W : W / 2;
          const y = H - (b.value / max) * H;
          return b.value > 0 ? (
            <circle key={b.date} cx={x} cy={y} r="3" fill="#b8860b" />
          ) : null;
        })}
        {/* X labels — show only a few to avoid crowding */}
        {bars.filter((_, i) => bars.length <= 7 || i % Math.ceil(bars.length / 6) === 0 || i === bars.length - 1).map((b, _, arr) => {
          const origIdx = bars.indexOf(b);
          const x = bars.length > 1 ? (origIdx / (bars.length - 1)) * W : W / 2;
          return (
            <text key={b.date} x={x} y={H + 18} textAnchor="middle" fontSize="9" fill="#667085">
              {b.label}
            </text>
          );
        })}
      </svg>
      <p className="mt-1 text-xs text-muted text-right">Accepted transfer value (USD) over time</p>
    </div>
  );
}

export function OverviewCharts({
  bars,
  totalAccepted,
  totalPending,
  totalDeclined,
  acceptedValueUSD,
  pkrRate,
  period,
}: OverviewChartsProps) {
  const pkrValue = acceptedValueUSD * pkrRate;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Bar chart - spans 2 cols */}
      <Card className="lg:col-span-2">
        <CardHeader
          title="Transfers by day"
          description="Stacked by status — green = accepted, amber = pending"
        />
        <div className="p-6">
          {bars.length === 0 ? (
            <p className="text-sm text-muted">No transfers in this period.</p>
          ) : (
            <BarChart bars={bars} />
          )}
        </div>
      </Card>

      {/* Donut breakdown */}
      <Card>
        <CardHeader title="Status breakdown" />
        <div className="p-6">
          <DonutChart accepted={totalAccepted} pending={totalPending} declined={totalDeclined} />
        </div>
      </Card>

      {/* Value line chart */}
      <Card className="lg:col-span-2">
        <CardHeader
          title="Revenue trend (accepted)"
          description="Accepted transfer value per day in USD"
        />
        <div className="p-6">
          {bars.every((b) => b.value === 0) ? (
            <p className="text-sm text-muted">No accepted value recorded in this period.</p>
          ) : (
            <ValueLineChart bars={bars} />
          )}
        </div>
      </Card>

      {/* Period total value */}
      <Card>
        <CardHeader title="Period revenue" />
        <div className="p-6 flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted mb-1">USD</p>
            <p className="text-3xl font-bold text-accent">
              ${acceptedValueUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted mb-1">PKR</p>
            <p className="text-2xl font-bold text-foreground">
              ₨{pkrValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted">
              Rate: 1 USD = ₨{pkrRate.toFixed(2)}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {totalAccepted} accepted · {totalPending} pending · {totalDeclined} declined
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
