import type { Metadata } from "next";
import { forbidden } from "next/navigation";

import { requireSession } from "@/features/auth/session";
import { canManageEmployees, canViewEmployeeList } from "@/features/employees/authorization";
import { listEmployees } from "@/features/employees/queries";
import { employeeListQuerySchema } from "@/features/employees/schemas";
import { EmployeesTable } from "@/features/employees/components/employees-table";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Employees | EMS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EmployeesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!canViewEmployeeList(session.role)) forbidden();

  const rawParams = await searchParams;
  const query = employeeListQuerySchema.parse(rawParams);

  const [{ items, pagination }, departments] = await Promise.all([
    listEmployees(query, session),
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <p className="text-sm text-muted-foreground">
          {session.role === "MANAGER" ? "Your direct reports." : "Company-wide employee directory."}
        </p>
      </div>

      <EmployeesTable
        items={items}
        pagination={pagination}
        departments={departments}
        canManage={canManageEmployees(session.role)}
        query={{
          search: query.search ?? "",
          departmentId: query.departmentId ?? "",
          status: query.status ?? "",
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        }}
      />
    </div>
  );
}
