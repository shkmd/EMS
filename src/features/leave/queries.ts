import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { utcMonthRange } from "@/lib/date-only"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canActAsHr, canViewLeaveRequest, canViewTeamLeave } from "@/features/leave/authorization"
import type { LeaveListQuery } from "@/features/leave/schemas"

export async function listLeaveTypes() {
  return prisma.leaveType.findMany({ orderBy: { name: "asc" } })
}

export async function getLeaveBalances(employeeId: string, year: number) {
  const [balances, leaveTypes] = await Promise.all([
    prisma.leaveBalance.findMany({ where: { employeeId, year }, include: { leaveType: true } }),
    prisma.leaveType.findMany(),
  ])

  const byType = new Map(balances.map((b) => [b.leaveTypeId, b]))

  return leaveTypes.map((lt) => {
    const balance = byType.get(lt.id)
    const allocated = balance ? Number(balance.allocated) : Number(lt.defaultDaysPerYear)
    const used = balance ? Number(balance.used) : 0
    return {
      leaveTypeId: lt.id,
      name: lt.name,
      code: lt.code,
      isPaid: lt.isPaid,
      allocated,
      used,
      remaining: Math.max(0, allocated - used),
    }
  })
}

const requestInclude = {
  leaveType: true,
  employee: { select: { id: true, firstName: true, lastName: true, reportingManagerId: true, profilePhotoUrl: true } },
  manager: { select: { id: true, firstName: true, lastName: true } },
  hr: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.LeaveRequestInclude

export async function listLeaveRequests(query: LeaveListQuery, viewer: AccessTokenPayload) {
  const where: Prisma.LeaveRequestWhereInput = {}

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
      where.employee = { reportingManagerId: viewer.employeeId }
      break
    }
    case "hr-pending": {
      if (!canActAsHr(viewer.role)) throw new ForbiddenError()
      where.status = { in: ["PENDING", "MANAGER_APPROVED"] }
      break
    }
    case "all": {
      if (!canViewTeamLeave(viewer.role)) throw new ForbiddenError()
      if (viewer.role === "MANAGER") where.employee = { reportingManagerId: viewer.employeeId }
      if (query.employeeId) where.employeeId = query.employeeId
      break
    }
  }

  return prisma.leaveRequest.findMany({
    where,
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  })
}

export async function getLeaveRequestDetail(id: string, viewer: AccessTokenPayload) {
  const request = await prisma.leaveRequest.findUnique({ where: { id }, include: requestInclude })
  if (!request) throw new NotFoundError("Leave request not found")
  if (!canViewLeaveRequest(viewer, request)) throw new ForbiddenError()
  return request
}

export async function getLeaveCalendar(year: number, month: number, viewer: AccessTokenPayload) {
  const { start, end } = utcMonthRange(year, month)

  const employeeScope: Prisma.EmployeeWhereInput | undefined =
    viewer.role === "MANAGER" ? { reportingManagerId: viewer.employeeId } : undefined

  return prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      startDate: { lte: end },
      endDate: { gte: start },
      ...(employeeScope ? { employee: employeeScope } : {}),
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      duration: true,
      employee: { select: { id: true, firstName: true, lastName: true } },
      leaveType: { select: { name: true, code: true } },
    },
    orderBy: { startDate: "asc" },
  })
}
