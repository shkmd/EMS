import type { Metadata } from "next";

import { requireSession } from "@/features/auth/session";
import { ForbiddenError } from "@/lib/errors";
import { canManageEmployees } from "@/features/employees/authorization";
import { getEmployeeDetail } from "@/features/employees/queries";
import { getEmployeeFormOptions } from "@/features/employees/lib/form-options";
import { employeeToFormValues } from "@/features/employees/lib/to-form-values";
import { EmployeeForm } from "@/features/employees/components/employee-form";

export const metadata: Metadata = { title: "Edit Employee | EMS" };

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!canManageEmployees(session.role)) throw new ForbiddenError();

  const { id } = await params;
  const [employee, { departments, designations, managers, verticals }] = await Promise.all([
    getEmployeeDetail(id, session),
    getEmployeeFormOptions(id),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit {employee.firstName} {employee.lastName}
        </h1>
        <p className="text-sm text-muted-foreground">{employee.employeeCode}</p>
      </div>

      <EmployeeForm
        mode="edit"
        employeeId={employee.id}
        defaultValues={employeeToFormValues(employee)}
        departments={departments.map((d) => ({ id: d.id, label: d.name }))}
        designations={designations.map((d) => ({ id: d.id, label: d.title, departmentId: d.departmentId }))}
        managers={managers.map((m) => ({ id: m.id, label: `${m.firstName} ${m.lastName}` }))}
        verticals={verticals.map((v) => ({ id: v.id, label: v.name }))}
      />
    </div>
  );
}
