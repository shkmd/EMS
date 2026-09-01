import type { Metadata } from "next";
import { forbidden } from "next/navigation";

import { requireSession } from "@/features/auth/session";
import { canCreateEmployees } from "@/features/employees/authorization";
import { getEmployeeFormOptions } from "@/features/employees/lib/form-options";
import { EmployeeForm } from "@/features/employees/components/employee-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Add Employee | EMS" };

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ candidateId?: string; firstName?: string; lastName?: string; email?: string; mobile?: string }>;
}) {
  const session = await requireSession();
  if (!canCreateEmployees(session.role)) forbidden();

  // Managers may only add employees into their own department — the form
  // locks that field to it, and createEmployee enforces it server-side too.
  let lockedDepartmentId: string | undefined;
  let managerDefaults: { departmentId?: string; reportingManagerId?: string } = {};
  if (session.role === "MANAGER") {
    const manager = session.employeeId
      ? await prisma.employee.findUnique({ where: { id: session.employeeId }, select: { id: true, departmentId: true } })
      : null;
    if (!manager?.departmentId) forbidden();
    lockedDepartmentId = manager.departmentId;
    managerDefaults = { departmentId: manager.departmentId, reportingManagerId: manager.id };
  }

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
        defaultValues={{ ...(candidateId ? { firstName, lastName, email, mobile } : undefined), ...managerDefaults }}
        lockDepartment={!!lockedDepartmentId}
        departments={departments.map((d) => ({ id: d.id, label: d.name }))}
        designations={designations.map((d) => ({ id: d.id, label: d.title, departmentId: d.departmentId }))}
        managers={managers.map((m) => ({ id: m.id, label: `${m.firstName} ${m.lastName}` }))}
        verticals={verticals.map((v) => ({ id: v.id, label: v.name }))}
      />
    </div>
  );
}
