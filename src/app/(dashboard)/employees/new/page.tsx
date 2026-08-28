import type { Metadata } from "next";
import { forbidden } from "next/navigation";

import { requireSession } from "@/features/auth/session";
import { canManageEmployees } from "@/features/employees/authorization";
import { getEmployeeFormOptions } from "@/features/employees/lib/form-options";
import { EmployeeForm } from "@/features/employees/components/employee-form";

export const metadata: Metadata = { title: "Add Employee | EMS" };

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ candidateId?: string; firstName?: string; lastName?: string; email?: string; mobile?: string }>;
}) {
  const session = await requireSession();
  if (!canManageEmployees(session.role)) forbidden();

  const { departments, designations, managers, verticals } = await getEmployeeFormOptions();
  const { candidateId, firstName, lastName, email, mobile } = await searchParams;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Employee</h1>
        <p className="text-sm text-muted-foreground">
          {candidateId ? "Complete the profile to convert this candidate into an employee." : "Create a new employee profile."}
        </p>
      </div>

      <EmployeeForm
        mode="create"
        linkedCandidateId={candidateId}
        defaultValues={candidateId ? { firstName, lastName, email, mobile } : undefined}
        departments={departments.map((d) => ({ id: d.id, label: d.name }))}
        designations={designations.map((d) => ({ id: d.id, label: d.title, departmentId: d.departmentId }))}
        managers={managers.map((m) => ({ id: m.id, label: `${m.firstName} ${m.lastName}` }))}
        verticals={verticals.map((v) => ({ id: v.id, label: v.name }))}
      />
    </div>
  );
}
