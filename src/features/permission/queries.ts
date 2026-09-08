import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canActAsHr, canViewPermissionRequest, canViewTeamPermission } from "@/features/permission/authorization"
import { getManagedVerticalIds } from "@/features/verticals/scope"
import type { PermissionListQuery } from "@/features/permission/schemas"

/** MANAGER's team scope: direct reports plus anyone in a vertical they manage. */
async function managerEmployeeScope(viewer: AccessTokenPayload): Promise<Prisma.EmployeeWhereInput> {
  const managedVerticalIds = await getManagedVerticalIds(viewer)
  return {
    OR: [
      { reportingManagerId: viewer.employeeId },
      ...(managedVerticalIds.length > 0 ? [{ verticalId: { in: managedVerticalIds } }] : []),
    ],
  }
}

const requestInclude = {
  employee: {
    select: { id: true, firstName: true, lastName: true, reportingManagerId: true, verticalId: true, profilePhotoUrl: true },
  },
  manager: { select: { id: true, firstName: true, lastName: true } },
  hr: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.PermissionRequestInclude

export async function listPermissionRequests(query: PermissionListQuery, viewer: AccessTokenPayload) {
  const where: Prisma.PermissionRequestWhereInput = {}

  if (query.status) where.status = query.status

  switch (query.scope) {
    case "mine": {
      if (!viewer.employeeId) return []
      where.employeeId = viewer.employeeId
      break
    }
    case "team-pending": {
      if (viewer.role !== "MANAGER") throw new ForbiddenError()
      where.status = "PENDING"
      where.employee = await managerEmployeeScope(viewer)
      break
    }
    case "hr-pending": {
      if (!canActAsHr(viewer.role)) throw new ForbiddenError()
      where.status = { in: ["PENDING", "MANAGER_APPROVED"] }
      break
    }
    case "all": {
      if (!canViewTeamPermission(viewer.role)) throw new ForbiddenError()
      if (viewer.role === "MANAGER") where.employee = await managerEmployeeScope(viewer)
      if (query.employeeId) where.employeeId = query.employeeId
      break
    }
  }

  return prisma.permissionRequest.findMany({
    where,
    include: requestInclude,
    orderBy: query.scope === "all" ? { date: "desc" } : { createdAt: "desc" },
  })
}

export async function getPermissionRequestDetail(id: string, viewer: AccessTokenPayload) {
  const request = await prisma.permissionRequest.findUnique({ where: { id }, include: requestInclude })
  if (!request) throw new NotFoundError("Permission request not found")
  const managedVerticalIds = await getManagedVerticalIds(viewer)
  if (!canViewPermissionRequest(viewer, request, managedVerticalIds)) throw new ForbiddenError()
  return request
}
