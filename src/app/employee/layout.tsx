import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/nav";

const EMPLOYEE_LINKS = [
  { href: "/employee", label: "Dashboard" },
  { href: "/employee/leads", label: "Submit Lead" },
  { href: "/employee/leads/history", label: "My Leads" },
  { href: "/employee/upload", label: "Log Transfers" },
  { href: "/employee/history", label: "History" },
];

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, full_name, employee_id").eq("id", user.id).single();
  if (profile?.role !== "employee") redirect("/login");

  const { data: employee } = await supabase
    .from("employees").select("archived_at").eq("id", profile.employee_id).single();

  if (employee?.archived_at) {
    await supabase.auth.signOut();
    redirect("/login?archived=1");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav brand="VOXPACT" links={EMPLOYEE_LINKS} userLabel={profile.full_name ?? "Employee"} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
