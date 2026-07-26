import "server-only"

import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/errors"

export async function listDesignations(filters?: { search?: string; departmentId?: string }) {
  return prisma.designation.findMany({
    where: {
      ...(filters?.search ? { title: { contains: filters.search } } : {}),
      ...(filters?.departmentId ? { departmentId: filters.departmentId } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      department: { select: { id: true, name: true } },
      _count: { select: { employees: { where: { deletedAt: null } } } },
    },
    orderBy: { title: "asc" },
  })
}

export async function getDesignationById(id: string) {
  const designation = await prisma.designation.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true } },
      _count: { select: { employees: { where: { deletedAt: null } } } },
    },
  })
  if (!designation) throw new NotFoundError("Designation not found")
  return designation
}
