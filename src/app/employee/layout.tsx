import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/nav";
import { RealtimeRefresher } from "@/components/realtime-refresher";

const EMPLOYEE_LINKS = [
  { href: "/employee", label: "Dashboard" },
  { href: "/employee/submit", label: "Submit Lead" },
  { href: "/employee/clients", label: "My Clients" },
  { href: "/employee/history", label: "History" },
  { href: "/employee/stats", label: "Stats" },
  { href: "/employee/pay", label: "My Pay" },
];

export default async function EmployeeLayout({
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
    .select("role, full_name, employee_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "employee") redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <RealtimeRefresher table="transfers" filterColumn="submitted_by" filterValue={profile.employee_id ?? ""} />
      <AppNav
        brand="Transferly"
        links={EMPLOYEE_LINKS}
        userLabel={profile.full_name ?? undefined}
      />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
