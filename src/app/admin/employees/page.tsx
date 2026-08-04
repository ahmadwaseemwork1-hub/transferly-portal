import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { cn, todayISO } from "@/lib/utils";
import type { Employee, Transfer } from "@/lib/types";

const EMPLOYMENT_LABELS: Record<string, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
  part_time: "Part-time",
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const filter = statusParam === "active" || statusParam === "inactive" ? statusParam : "all";

  const supabase = await createClient();
  const today = todayISO();

  const [{ data: employees }, { data: transfers }] = await Promise.all([
    supabase.from("employees").select("*").order("full_name"),
    supabase.from("transfers").select("*").eq("transfer_date", today),
  ]);

  const employeeList = (employees ?? []) as Employee[];
  const transferList = (transfers ?? []) as Transfer[];
  const visibleEmployees =
    filter === "all" ? employeeList : employeeList.filter((e) => e.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Employees</h1>
          <p className="mt-1 text-sm text-muted">Your team, their setup, and today's activity.</p>
        </div>
        <Link href="/admin/employees/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add employee
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/admin/employees" : `/admin/employees?status=${f.value}`}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-primary-soft text-primary hover:bg-primary/10"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {visibleEmployees.length === 0 ? (
        <Card>
          <EmptyState
            title={employeeList.length === 0 ? "No employees yet" : "No employees match this filter"}
            description={
              employeeList.length === 0
                ? "Add your first employee to start assigning clients and tracking transfers."
                : "Try a different status filter."
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleEmployees.map((employee) => {
            const todaySubmitted = transferList.filter(
              (t) => t.submitted_by === employee.id
            );
            const todayApproved = todaySubmitted.filter((t) => t.employee_approved);
            return (
              <Link key={employee.id} href={`/admin/employees/${employee.id}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{employee.full_name}</p>
                      <p className="text-sm text-muted">{employee.email}</p>
                    </div>
                    <Badge
                      className={cn(
                        employee.status === "active"
                          ? "bg-success-soft text-success"
                          : "bg-neutral-100 text-muted"
                      )}
                    >
                      {employee.status}
                    </Badge>
                  </div>
                  <Badge className="mt-3 bg-primary-soft text-primary">
                    {EMPLOYMENT_LABELS[employee.employment_type]}
                  </Badge>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {todaySubmitted.length}
                      </p>
                      <p className="text-xs text-muted">Submitted today</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {todayApproved.length}
                      </p>
                      <p className="text-xs text-muted">Approved today</p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
