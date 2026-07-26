import "server-only"

import { prisma } from "@/lib/prisma"

export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
    },
    orderBy: { createdAt: "asc" },
  })
}

/** Employees with no login yet — the only ones selectable when linking a new user to a profile. */
export async function listUnlinkedEmployees() {
  return prisma.employee.findMany({
    where: { userId: null, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })
}
