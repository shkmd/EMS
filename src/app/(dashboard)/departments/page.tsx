import type { Metadata } from "next";

import { requireSession } from "@/features/auth/session";
import { canManageDepartments } from "@/features/departments/authorization";
import { listDepartments } from "@/features/departments/queries";
import { DepartmentsClient } from "@/features/departments/components/departments-client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Departments | EMS" };

export default async function DepartmentsPage() {
  const session = await requireSession();
  const canManage = canManageDepartments(session.role);

  const [departments, employees] = await Promise.all([
    listDepartments(),
    prisma.employee.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
        <p className="text-sm text-muted-foreground">Manage company departments and their heads.</p>
      </div>

      <DepartmentsClient
        departments={departments}
        employees={employees.map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName}` }))}
        canManage={canManage}
      />
    </div>
  );
}
