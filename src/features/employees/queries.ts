import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { buildPaginationMeta } from "@/lib/api-response"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import type { EmployeeListQuery } from "@/features/employees/schemas"
import { canAccessEmployee, canManageEmployees } from "@/features/employees/authorization"

const employeeListSelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
  mobile: true,
  profilePhotoUrl: true,
  employmentType: true,
  status: true,
  dateOfJoining: true,
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, title: true } },
} satisfies Prisma.EmployeeSelect

export async function listEmployees(query: EmployeeListQuery, viewer: AccessTokenPayload) {
  const where: Prisma.EmployeeWhereInput = { deletedAt: null }

  if (viewer.role === "MANAGER") {
    where.reportingManagerId = viewer.employeeId
  }

  if (query.departmentId) where.departmentId = query.departmentId
  if (query.status) where.status = query.status
  if (query.search) {
    const search = query.search
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { employeeCode: { contains: search } },
      { email: { contains: search } },
      { mobile: { contains: search } },
    ]
  }

  const orderBy: Prisma.EmployeeOrderByWithRelationInput[] = (() => {
    switch (query.sortBy) {
      case "employeeCode":
        return [{ employeeCode: query.sortOrder }]
      case "dateOfJoining":
        return [{ dateOfJoining: query.sortOrder }]
      case "department":
        return [{ department: { name: query.sortOrder } }]
      case "name":
      default:
        return [{ firstName: query.sortOrder }, { lastName: query.sortOrder }]
    }
  })()

  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      select: employeeListSelect,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.employee.count({ where }),
  ])

  return { items, pagination: buildPaginationMeta(query.page, query.pageSize, total) }
}

/** Same filters as listEmployees, without pagination — used by export. */
export async function listAllEmployeesForExport(query: Omit<EmployeeListQuery, "page" | "pageSize">, viewer: AccessTokenPayload) {
  const where: Prisma.EmployeeWhereInput = { deletedAt: null }
  if (viewer.role === "MANAGER") where.reportingManagerId = viewer.employeeId
  if (query.departmentId) where.departmentId = query.departmentId
  if (query.status) where.status = query.status
  if (query.search) {
    const search = query.search
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { employeeCode: { contains: search } },
      { email: { contains: search } },
      { mobile: { contains: search } },
    ]
  }

  return prisma.employee.findMany({
    where,
    select: employeeListSelect,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })
}

export async function getEmployeeDetail(id: string, viewer: AccessTokenPayload) {
  const employee = await prisma.employee.findUnique({
    where: { id, deletedAt: null },
    include: {
      department: { select: { id: true, name: true } },
      designation: { select: { id: true, title: true } },
      vertical: { select: { id: true, name: true } },
      user: { select: { id: true, email: true, role: true, isActive: true } },
      reportingManager: { select: { id: true, firstName: true, lastName: true } },
      documents: { orderBy: { uploadedAt: "desc" } },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, email: true } } },
      },
      timelineEvents: { orderBy: { eventDate: "desc" } },
    },
  })

  if (!employee) throw new NotFoundError("Employee not found")
  if (!canAccessEmployee(viewer, employee)) throw new ForbiddenError()

  return employee
}

export function assertCanManageEmployees(viewer: AccessTokenPayload) {
  if (!canManageEmployees(viewer.role)) throw new ForbiddenError()
}
