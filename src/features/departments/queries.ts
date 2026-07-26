import "server-only"

import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/errors"

export async function listDepartments(search?: string) {
  return prisma.department.findMany({
    where: search
      ? { name: { contains: search } }
      : undefined,
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      head: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { employees: { where: { deletedAt: null } }, designations: true } },
    },
    orderBy: { name: "asc" },
  })
}

export async function getDepartmentById(id: string) {
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      head: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { employees: { where: { deletedAt: null } }, designations: true } },
    },
  })
  if (!department) throw new NotFoundError("Department not found")
  return department
}
