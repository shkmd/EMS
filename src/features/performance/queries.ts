import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManagePerformance, canViewEmployeePerformance } from "@/features/performance/authorization"

export async function requireEmployeeForPerformance(employeeId: string, viewer: AccessTokenPayload) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, reportingManagerId: true },
  })
  if (!employee) throw new NotFoundError("Employee not found")
  if (!canViewEmployeePerformance(viewer, employee)) throw new ForbiddenError()
  return employee
}

export async function listGoals(employeeId: string, viewer: AccessTokenPayload) {
  await requireEmployeeForPerformance(employeeId, viewer)
  return prisma.performanceGoal.findMany({ where: { employeeId }, orderBy: { dueDate: "asc" } })
}

export async function listKpis(employeeId: string, viewer: AccessTokenPayload) {
  await requireEmployeeForPerformance(employeeId, viewer)
  return prisma.kPI.findMany({ where: { employeeId }, orderBy: { period: "desc" } })
}

const reviewInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, reportingManagerId: true } },
  reviewer: { select: { id: true, email: true } },
  ratings: true,
} as const

export async function listReviews(employeeId: string, viewer: AccessTokenPayload) {
  await requireEmployeeForPerformance(employeeId, viewer)
  const isSelf = viewer.employeeId === employeeId && !canManagePerformance(viewer.role)

  return prisma.performanceReview.findMany({
    where: { employeeId, ...(isSelf ? { status: { in: ["SUBMITTED", "ACKNOWLEDGED"] } } : {}) },
    include: reviewInclude,
    orderBy: { reviewPeriodStart: "desc" },
  })
}

export async function getReviewDetail(id: string, viewer: AccessTokenPayload) {
  const review = await prisma.performanceReview.findUnique({ where: { id }, include: reviewInclude })
  if (!review) throw new NotFoundError("Review not found")
  if (!canViewEmployeePerformance(viewer, review.employee)) throw new ForbiddenError()
  if (review.status === "DRAFT" && viewer.employeeId === review.employeeId && !canManagePerformance(viewer.role)) {
    throw new ForbiddenError()
  }
  return review
}

/** Employees a manager/HR/admin may manage performance for. */
export async function listManageableEmployees(viewer: AccessTokenPayload) {
  if (viewer.role === "MANAGER") {
    return prisma.employee.findMany({
      where: { deletedAt: null, reportingManagerId: viewer.employeeId },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    })
  }
  return prisma.employee.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })
}
