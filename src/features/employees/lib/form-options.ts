import "server-only"

import { prisma } from "@/lib/prisma"

export async function getEmployeeFormOptions(excludeEmployeeId?: string) {
  const [departments, designations, managers, verticals] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.designation.findMany({
      select: { id: true, title: true, departmentId: true },
      orderBy: { title: "asc" },
    }),
    prisma.employee.findMany({
      where: { deletedAt: null, status: "ACTIVE", ...(excludeEmployeeId ? { id: { not: excludeEmployeeId } } : {}) },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.vertical.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ])

  return { departments, designations, managers, verticals }
}
