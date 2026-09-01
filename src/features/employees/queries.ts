import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { buildPaginationMeta } from "@/lib/api-response"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import type { EmployeeListQuery } from "@/features/employees/schemas"
import { canAccessEmployee, canManageEmployees, canDeleteEmployee } from "@/features/employees/authorization"
import { getManagedVerticalIds } from "@/features/verticals/scope"

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
  verticalId: true,
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, title: true } },
} satisfies Prisma.EmployeeSelect

/** MANAGER sees their direct reports plus anyone in a vertical they manage. */
function managerScope(viewer: AccessTokenPayload, managedVerticalIds: string[]): Prisma.EmployeeWhereInput | undefined {
  if (viewer.role !== "MANAGER") return undefined
  return {
    OR: [{ reportingManagerId: viewer.employeeId }, ...(managedVerticalIds.length > 0 ? [{ verticalId: { in: managedVerticalIds } }] : [])],
  }
}

export async function listEmployees(query: EmployeeListQuery, viewer: AccessTokenPayload) {
  const conditions: Prisma.EmployeeWhereInput[] = [{ deletedAt: null }]

  const managedVerticalIds = await getManagedVerticalIds(viewer)
  const scope = managerScope(viewer, managedVerticalIds)
  if (scope) conditions.push(scope)

  if (query.departmentId) conditions.push({ departmentId: query.departmentId })
  if (query.status) conditions.push({ status: query.status })
  if (query.search) {
    const search = query.search
    conditions.push({
      OR: [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { employeeCode: { contains: search } },
        { email: { contains: search } },
        { mobile: { contains: search } },
      ],
    })
  }

  const where: Prisma.EmployeeWhereInput = { AND: conditions }

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

  const itemsWithDelete = items.map((item) => ({ ...item, canDelete: canDeleteEmployee(viewer, item, managedVerticalIds) }))

  return { items: itemsWithDelete, pagination: buildPaginationMeta(query.page, query.pageSize, total) }
}

/** Same filters as listEmployees, without pagination — used by export. */
export async function listAllEmployeesForExport(query: Omit<EmployeeListQuery, "page" | "pageSize">, viewer: AccessTokenPayload) {
  const conditions: Prisma.EmployeeWhereInput[] = [{ deletedAt: null }]

  const scope = managerScope(viewer, await getManagedVerticalIds(viewer))
  if (scope) conditions.push(scope)

  if (query.departmentId) conditions.push({ departmentId: query.departmentId })
  if (query.status) conditions.push({ status: query.status })
  if (query.search) {
    const search = query.search
    conditions.push({
      OR: [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { employeeCode: { contains: search } },
        { email: { contains: search } },
        { mobile: { contains: search } },
      ],
    })
  }

  return prisma.employee.findMany({
    where: { AND: conditions },
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
  const managedVerticalIds = await getManagedVerticalIds(viewer)
  if (!canAccessEmployee(viewer, employee, managedVerticalIds)) throw new ForbiddenError()

  return employee
}

export function assertCanManageEmployees(viewer: AccessTokenPayload) {
  if (!canManageEmployees(viewer.role)) throw new ForbiddenError()
}
