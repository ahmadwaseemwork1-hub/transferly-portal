import { requireClient } from "@/lib/auth";
import { StatCard, HeroBanner } from "@/components/ui";
import { computeStats } from "@/lib/stats";
import { formatCurrency, todayISO } from "@/lib/utils";
import type { Transfer } from "@/lib/types";
import { RealtimePendingTransfers } from "@/components/realtime-pending-transfers";

export default async function ClientDashboardPage() {
  const { supabase, profile } = await requireClient();
  const today = todayISO();

  const { data: transfers } = await supabase
    .from("transfers")
    .select("*")
    .eq("client_id", profile.client_id!)
    .order("transfer_date", { ascending: false });

  const transferList = (transfers ?? []) as Transfer[];
  const pending = transferList.filter((t) => t.status === "pending");
  const accepted = transferList.filter((t) => t.status === "accepted");
  const stats = computeStats(transferList, today);
  const acceptRate = transferList.length > 0
    ? Math.round((accepted.length / transferList.length) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <HeroBanner
        title={`Welcome back${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!`}
        subtitle={
          pending.length > 0
            ? `You have ${pending.length} transfer${pending.length !== 1 ? "s" : ""} waiting for your response.`
            : "You're all caught up — no pending transfers right now."
        }
        badge="Client Portal"
        action={
          pending.length > 0 ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-lg shadow-md">
              {pending.length}
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today"
          value={stats.dailyCount}
          hint="Live transfers today"
          accent="blue"
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="This week"
          value={stats.weeklyCount}
          hint="Last 7 days"
          accent="neutral"
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Accepted"
          value={accepted.length}
          hint={`${acceptRate}% acceptance rate`}
          accent="green"
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Credit pending"
          value={formatCurrency(stats.creditPending)}
          hint="Unbilled accepted transfers"
          accent="gold"
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      <RealtimePendingTransfers
        initialPending={pending}
        clientId={profile.client_id!}
      />
    </div>
  );
}
