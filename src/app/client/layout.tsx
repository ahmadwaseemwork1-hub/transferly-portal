import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/nav";

const CLIENT_LINKS = [
  { href: "/client", label: "Dashboard" },
  { href: "/client/stats", label: "Stats" },
  { href: "/client/history", label: "History" },
  { href: "/client/invoices", label: "Invoices" },
];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, full_name, client_id").eq("id", user.id).single();
  if (profile?.role !== "client") redirect("/login");

  const { data: client } = await supabase
    .from("clients").select("business_name").eq("id", profile.client_id).single();

  return (
    <div className="min-h-screen bg-background">
      <AppNav brand="VOXPACT" links={CLIENT_LINKS} userLabel={client?.business_name ?? profile.full_name ?? undefined} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
