import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/nav";
import { RealtimeRefresher } from "@/components/realtime-refresher";

const ADMIN_LINKS = [
  { href: "/admin", label: "Clients" },
  { href: "/admin/overview", label: "My Progress" },
  { href: "/admin/transfer-lead", label: "Transfer Lead" },
  { href: "/admin/upload", label: "Upload CSV" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/approvals", label: "Approvals" },
  { href: "/admin/payroll", label: "Payroll" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/financials", label: "Financials" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <RealtimeRefresher table="transfers" />
      <AppNav brand="VOXPACT Admin" links={ADMIN_LINKS} userLabel={profile.full_name ?? undefined} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
