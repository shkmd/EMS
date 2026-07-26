import "server-only"

import { prisma } from "@/lib/prisma"
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageEmployeePerformance, canManagePerformance } from "@/features/performance/authorization"
import type { GoalFormInput, KpiFormInput, ReviewFormInput, ReviewAcknowledgeInput } from "@/features/performance/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

async function assertCanManageEmployee(employeeId: string, viewer: AccessTokenPayload) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId, deletedAt: null },
    select: { id: true, reportingManagerId: true },
  })
  if (!employee) throw new NotFoundError("Employee not found")
  if (!canManageEmployeePerformance(viewer, employee)) throw new ForbiddenError()
  return employee
}

// Goals may be self-authored (employees setting their own goals is standard
// practice) as well as management-authored — unlike KPIs (assigned targets)
// and Reviews (inherently written by a reviewer), which stay management-only.
async function assertCanManageGoal(employeeId: string, viewer: AccessTokenPayload) {
  if (viewer.employeeId === employeeId) return
  await assertCanManageEmployee(employeeId, viewer)
}

// ---------- Goals ----------

export async function createGoal(input: GoalFormInput, viewer: AccessTokenPayload, meta: Meta) {
  await assertCanManageGoal(input.employeeId, viewer)

  const goal = await prisma.performanceGoal.create({
    data: {
      employeeId: input.employeeId,
      title: input.title,
      description: input.description || null,
      startDate: new Date(input.startDate),
      dueDate: new Date(input.dueDate),
      status: input.status,
      progress: Math.round(Number(input.progress)),
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "GOAL_CREATED", entityType: "PerformanceGoal", entityId: goal.id, ...meta })
  return goal
}

export async function updateGoal(id: string, input: GoalFormInput, viewer: AccessTokenPayload, meta: Meta) {
  const existing = await prisma.performanceGoal.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Goal not found")
  await assertCanManageGoal(existing.employeeId, viewer)

  const goal = await prisma.performanceGoal.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description || null,
      startDate: new Date(input.startDate),
      dueDate: new Date(input.dueDate),
      status: input.status,
      progress: Math.round(Number(input.progress)),
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "GOAL_UPDATED", entityType: "PerformanceGoal", entityId: id, ...meta })
  return goal
}

export async function deleteGoal(id: string, viewer: AccessTokenPayload, meta: Meta) {
  const existing = await prisma.performanceGoal.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Goal not found")
  await assertCanManageGoal(existing.employeeId, viewer)

  await prisma.performanceGoal.delete({ where: { id } })
  await recordAuditLog({ userId: viewer.sub, action: "GOAL_DELETED", entityType: "PerformanceGoal", entityId: id, ...meta })
}

// ---------- KPIs ----------

export async function createKpi(input: KpiFormInput, viewer: AccessTokenPayload, meta: Meta) {
  await assertCanManageEmployee(input.employeeId, viewer)

  const kpi = await prisma.kPI.create({
    data: {
      employeeId: input.employeeId,
      name: input.name,
      description: input.description || null,
      targetValue: Number(input.targetValue),
      achievedValue: Number(input.achievedValue),
      unit: input.unit || null,
      period: input.period,
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "KPI_CREATED", entityType: "KPI", entityId: kpi.id, ...meta })
  return kpi
}

export async function updateKpi(id: string, input: KpiFormInput, viewer: AccessTokenPayload, meta: Meta) {
  const existing = await prisma.kPI.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("KPI not found")
  await assertCanManageEmployee(existing.employeeId, viewer)

  const kpi = await prisma.kPI.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description || null,
      targetValue: Number(input.targetValue),
      achievedValue: Number(input.achievedValue),
      unit: input.unit || null,
      period: input.period,
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "KPI_UPDATED", entityType: "KPI", entityId: id, ...meta })
  return kpi
}

export async function deleteKpi(id: string, viewer: AccessTokenPayload, meta: Meta) {
  const existing = await prisma.kPI.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("KPI not found")
  await assertCanManageEmployee(existing.employeeId, viewer)

  await prisma.kPI.delete({ where: { id } })
  await recordAuditLog({ userId: viewer.sub, action: "KPI_DELETED", entityType: "KPI", entityId: id, ...meta })
}

// ---------- Reviews ----------

async function notifyUser(userId: string, employeeId: string | null, title: string, message: string, link: string) {
  try {
    await prisma.notification.create({ data: { userId, employeeId, type: "INFO", title, message, link } })
  } catch (error) {
    console.error("Failed to create notification:", error)
  }
}

export async function createReview(input: ReviewFormInput, viewer: AccessTokenPayload, meta: Meta) {
  await assertCanManageEmployee(input.employeeId, viewer)

  const overallRating =
    input.ratings.reduce((sum, r) => sum + Number(r.rating), 0) / input.ratings.length

  const review = await prisma.performanceReview.create({
    data: {
      employeeId: input.employeeId,
      reviewerId: viewer.sub,
      reviewPeriodStart: new Date(input.reviewPeriodStart),
      reviewPeriodEnd: new Date(input.reviewPeriodEnd),
      summary: input.summary || null,
      overallRating,
      status: "DRAFT",
      ratings: {
        create: input.ratings.map((r) => ({
          criterion: r.criterion,
          rating: Number(r.rating),
          comment: r.comment || null,
        })),
      },
    },
    include: { ratings: true },
  })

  await recordAuditLog({ userId: viewer.sub, action: "REVIEW_CREATED", entityType: "PerformanceReview", entityId: review.id, ...meta })
  return review
}

export async function submitReview(id: string, viewer: AccessTokenPayload, meta: Meta) {
  const review = await prisma.performanceReview.findUnique({
    where: { id },
    include: { employee: { select: { id: true, userId: true, firstName: true, lastName: true, reportingManagerId: true } } },
  })
  if (!review) throw new NotFoundError("Review not found")
  if (review.reviewerId !== viewer.sub && !canManagePerformance(viewer.role)) throw new ForbiddenError()
  if (review.status !== "DRAFT") throw new ValidationError("This review has already been submitted")

  const updated = await prisma.performanceReview.update({
    where: { id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  })

  if (review.employee.userId) {
    await notifyUser(
      review.employee.userId,
      review.employee.id,
      "Performance review available",
      "A new performance review has been submitted for you to review.",
      "/performance"
    )
  }

  await recordAuditLog({ userId: viewer.sub, action: "REVIEW_SUBMITTED", entityType: "PerformanceReview", entityId: id, ...meta })
  return updated
}

export async function acknowledgeReview(
  id: string,
  input: ReviewAcknowledgeInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  const review = await prisma.performanceReview.findUnique({ where: { id } })
  if (!review) throw new NotFoundError("Review not found")
  if (review.employeeId !== viewer.employeeId) throw new ForbiddenError()
  if (review.status !== "SUBMITTED") throw new ValidationError("This review isn't awaiting acknowledgement")

  const updated = await prisma.performanceReview.update({
    where: { id },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date(),
      summary: input.comment ? `${review.summary ?? ""}\n\nEmployee comment: ${input.comment}`.trim() : review.summary,
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "REVIEW_ACKNOWLEDGED", entityType: "PerformanceReview", entityId: id, ...meta })
  return updated
}

export async function deleteReview(id: string, viewer: AccessTokenPayload, meta: Meta) {
  const review = await prisma.performanceReview.findUnique({ where: { id } })
  if (!review) throw new NotFoundError("Review not found")
  if (review.reviewerId !== viewer.sub && !canManagePerformance(viewer.role)) throw new ForbiddenError()
  if (review.status !== "DRAFT") throw new ValidationError("Only draft reviews can be deleted")

  await prisma.performanceReview.delete({ where: { id } })
  await recordAuditLog({ userId: viewer.sub, action: "REVIEW_DELETED", entityType: "PerformanceReview", entityId: id, ...meta })
}
