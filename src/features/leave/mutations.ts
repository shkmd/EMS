import "server-only"

import { prisma } from "@/lib/prisma"
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import { sendMail, portalNotificationEmailTemplate } from "@/lib/mail"
import { getEnv } from "@/config/env"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canActAsHr, canActAsManager } from "@/features/leave/authorization"
import { calculateLeaveDays } from "@/features/leave/lib/calculate-days"
import type {
  ApplyLeaveInput,
  LeaveActionInput,
  LeaveRequestUpdateInput,
  LeaveRequestCreateForEmployeeInput,
} from "@/features/leave/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

async function notifyUser(userId: string, employeeId: string | null, title: string, message: string, link: string) {
  try {
    await prisma.notification.create({
      data: { userId, employeeId, type: "INFO", title, message, link },
    })
  } catch (error) {
    console.error("Failed to create notification:", error)
  }

  // Real email alongside the in-app notification, so leave requests and
  // decisions reach people even when they aren't actively in the portal.
  // The email links back to the portal action itself rather than acting
  // one-click from the email, so approving/rejecting always goes through
  // the same authenticated, audited API path — no separate security surface.
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, isActive: true } })
    if (user?.isActive) {
      const actionUrl = `${getEnv().NEXT_PUBLIC_APP_URL}${link}`
      await sendMail({ to: user.email, ...portalNotificationEmailTemplate(title, message, actionUrl) })
    }
  } catch (error) {
    console.error("Failed to send leave notification email:", error)
  }
}

async function notifyHrUsers(title: string, message: string, link: string) {
  const hrUsers = await prisma.user.findMany({
    where: { role: { in: ["HR", "SUPER_ADMIN"] }, isActive: true },
    select: { id: true, employee: { select: { id: true } } },
  })
  await Promise.all(hrUsers.map((u) => notifyUser(u.id, u.employee?.id ?? null, title, message, link)))
}

async function ensureLeaveBalance(employeeId: string, leaveTypeId: string, year: number, defaultDays: number) {
  return prisma.leaveBalance.upsert({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    update: {},
    create: { employeeId, leaveTypeId, year, allocated: defaultDays, used: 0 },
  })
}

export async function applyLeave(input: ApplyLeaveInput, viewer: AccessTokenPayload, meta: Meta) {
  if (!viewer.employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")

  const employee = await prisma.employee.findUnique({
    where: { id: viewer.employeeId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, reportingManagerId: true },
  })
  if (!employee) throw new NotFoundError("Employee not found")

  const leaveType = await prisma.leaveType.findUnique({ where: { id: input.leaveTypeId } })
  if (!leaveType) throw new ValidationError("Invalid leave type")

  const startDate = new Date(input.startDate)
  const endDate = new Date(input.endDate)
  const days = await calculateLeaveDays(startDate, endDate, input.duration, employee.id)
  if (days <= 0) {
    throw new ValidationError("The selected range doesn't include any working days")
  }

  const year = startDate.getUTCFullYear()

  if (leaveType.isPaid) {
    const balance = await ensureLeaveBalance(employee.id, leaveType.id, year, leaveType.defaultDaysPerYear)
    const remaining = Number(balance.allocated) - Number(balance.used)
    if (days > remaining) {
      throw new ValidationError(
        `Insufficient ${leaveType.name} balance: ${remaining} day(s) remaining, ${days} requested`
      )
    }
  }

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId: employee.id,
      leaveTypeId: leaveType.id,
      startDate,
      endDate,
      duration: input.duration,
      days,
      reason: input.reason,
      status: "PENDING",
    },
  })

  const applicantName = `${employee.firstName} ${employee.lastName}`
  if (employee.reportingManagerId) {
    const manager = await prisma.employee.findUnique({
      where: { id: employee.reportingManagerId },
      select: { userId: true, id: true },
    })
    if (manager?.userId) {
      await notifyUser(
        manager.userId,
        manager.id,
        "Leave request awaiting your approval",
        `${applicantName} applied for ${leaveType.name} (${days} day(s)).`,
        "/leave?tab=approvals"
      )
    }
  } else {
    await notifyHrUsers(
      "Leave request awaiting approval",
      `${applicantName} applied for ${leaveType.name} (${days} day(s)) and has no assigned manager.`,
      "/leave?tab=approvals"
    )
  }

  await recordAuditLog({
    userId: viewer.sub,
    action: "LEAVE_APPLIED",
    entityType: "LeaveRequest",
    entityId: request.id,
    ...meta,
  })

  return request
}

export async function managerAction(id: string, input: LeaveActionInput, viewer: AccessTokenPayload, meta: Meta) {
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true, leaveType: true },
  })
  if (!request) throw new NotFoundError("Leave request not found")
  if (!canActAsManager(viewer, request)) throw new ForbiddenError()
  if (request.status !== "PENDING") {
    throw new ValidationError("This request has already been actioned")
  }

  const managerEmployeeId = viewer.employeeId ?? null

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: input.action === "APPROVE" ? "MANAGER_APPROVED" : "REJECTED",
      managerId: managerEmployeeId,
      managerActionAt: new Date(),
      managerComment: input.comment || null,
    },
  })

  const employeeName = `${request.employee.firstName} ${request.employee.lastName}`

  if (input.action === "APPROVE") {
    await notifyHrUsers(
      "Leave request awaiting final approval",
      `${employeeName}'s ${request.leaveType.name} request was approved by their manager and needs HR sign-off.`,
      "/leave?tab=approvals"
    )
  } else if (request.employee.userId) {
    await notifyUser(
      request.employee.userId,
      request.employeeId,
      "Leave request rejected",
      `Your ${request.leaveType.name} request was rejected by your manager.`,
      "/leave"
    )
  }

  await recordAuditLog({
    userId: viewer.sub,
    action: input.action === "APPROVE" ? "LEAVE_MANAGER_APPROVED" : "LEAVE_MANAGER_REJECTED",
    entityType: "LeaveRequest",
    entityId: id,
    ...meta,
  })

  return updated
}

export async function hrAction(id: string, input: LeaveActionInput, viewer: AccessTokenPayload, meta: Meta) {
  if (!canActAsHr(viewer.role)) throw new ForbiddenError()

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true, leaveType: true },
  })
  if (!request) throw new NotFoundError("Leave request not found")
  if (request.status !== "PENDING" && request.status !== "MANAGER_APPROVED") {
    throw new ValidationError("This request has already been actioned")
  }

  const hrEmployeeId = viewer.employeeId ?? null
  const approving = input.action === "APPROVE"

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: approving ? "APPROVED" : "REJECTED",
        hrId: hrEmployeeId,
        hrActionAt: new Date(),
        hrComment: input.comment || null,
      },
    })

    if (approving && request.leaveType.isPaid) {
      const year = request.startDate.getUTCFullYear()
      await tx.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year } },
        update: { used: { increment: request.days } },
        create: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
          allocated: request.leaveType.defaultDaysPerYear,
          used: request.days,
        },
      })
    }

    return result
  })

  if (request.employee.userId) {
    await notifyUser(
      request.employee.userId,
      request.employeeId,
      approving ? "Leave request approved" : "Leave request rejected",
      approving
        ? `Your ${request.leaveType.name} request (${request.days} day(s)) has been approved.`
        : `Your ${request.leaveType.name} request was rejected by HR.`,
      "/leave"
    )
  }

  await recordAuditLog({
    userId: viewer.sub,
    action: approving ? "LEAVE_HR_APPROVED" : "LEAVE_HR_REJECTED",
    entityType: "LeaveRequest",
    entityId: id,
    ...meta,
  })

  return updated
}

/** HR-only direct correction of an existing request's dates/type/duration/
 * reason/status — for fixing mistakes, not the normal apply→approve flow.
 * Reverses whatever balance impact the OLD status/type/days had, then
 * reapplies for the NEW ones, so any combination of changes (different
 * days, different leave type, different status) nets out correctly. */
export async function updateLeaveRequest(id: string, input: LeaveRequestUpdateInput, viewer: AccessTokenPayload, meta: Meta) {
  if (!canActAsHr(viewer.role)) throw new ForbiddenError()

  const existing = await prisma.leaveRequest.findUnique({ where: { id }, include: { leaveType: true } })
  if (!existing) throw new NotFoundError("Leave request not found")

  const newLeaveType = await prisma.leaveType.findUnique({ where: { id: input.leaveTypeId } })
  if (!newLeaveType) throw new ValidationError("Invalid leave type")

  const startDate = new Date(input.startDate)
  const endDate = new Date(input.endDate)
  const days = await calculateLeaveDays(startDate, endDate, input.duration, existing.employeeId)
  if (days <= 0) {
    throw new ValidationError("The selected range doesn't include any working days")
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (existing.status === "APPROVED" && existing.leaveType.isPaid) {
      const oldYear = existing.startDate.getUTCFullYear()
      await tx.leaveBalance.updateMany({
        where: { employeeId: existing.employeeId, leaveTypeId: existing.leaveTypeId, year: oldYear },
        data: { used: { decrement: existing.days } },
      })
    }

    if (input.status === "APPROVED" && newLeaveType.isPaid) {
      const newYear = startDate.getUTCFullYear()
      await tx.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: existing.employeeId, leaveTypeId: newLeaveType.id, year: newYear } },
        update: { used: { increment: days } },
        create: {
          employeeId: existing.employeeId,
          leaveTypeId: newLeaveType.id,
          year: newYear,
          allocated: newLeaveType.defaultDaysPerYear,
          used: days,
        },
      })
    }

    return tx.leaveRequest.update({
      where: { id },
      data: {
        leaveTypeId: newLeaveType.id,
        startDate,
        endDate,
        duration: input.duration,
        days,
        reason: input.reason,
        status: input.status,
      },
    })
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "LEAVE_CORRECTED",
    entityType: "LeaveRequest",
    entityId: id,
    metadata: { previousStatus: existing.status, newStatus: input.status },
    ...meta,
  })

  return updated
}

/** HR-only creation of a leave request on behalf of an employee, dated in
 * the past — for backfilling leave taken before the employee started using
 * the portal. Unlike applyLeave, this skips the insufficient-balance check:
 * the leave already happened, so the balance is what needs to catch up to
 * reality, not the other way around. */
export async function createLeaveRequestForEmployee(
  input: LeaveRequestCreateForEmployeeInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  if (!canActAsHr(viewer.role)) throw new ForbiddenError()

  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId, deletedAt: null },
    select: { id: true },
  })
  if (!employee) throw new NotFoundError("Employee not found")

  const leaveType = await prisma.leaveType.findUnique({ where: { id: input.leaveTypeId } })
  if (!leaveType) throw new ValidationError("Invalid leave type")

  const startDate = new Date(input.startDate)
  const endDate = new Date(input.endDate)
  const days = await calculateLeaveDays(startDate, endDate, input.duration, employee.id)
  if (days <= 0) {
    throw new ValidationError("The selected range doesn't include any working days")
  }

  const hrEmployeeId = viewer.employeeId ?? null

  const created = await prisma.$transaction(async (tx) => {
    const request = await tx.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        startDate,
        endDate,
        duration: input.duration,
        days,
        reason: input.reason,
        status: input.status,
        ...(input.status === "APPROVED" ? { hrId: hrEmployeeId, hrActionAt: new Date() } : {}),
      },
    })

    if (input.status === "APPROVED" && leaveType.isPaid) {
      const year = startDate.getUTCFullYear()
      await tx.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: leaveType.id, year } },
        update: { used: { increment: days } },
        create: { employeeId: employee.id, leaveTypeId: leaveType.id, year, allocated: leaveType.defaultDaysPerYear, used: days },
      })
    }

    return request
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "LEAVE_RECORDED",
    entityType: "LeaveRequest",
    entityId: created.id,
    metadata: { employeeId: employee.id, status: input.status },
    ...meta,
  })

  return created
}

export async function cancelLeave(id: string, viewer: AccessTokenPayload, meta: Meta) {
  const request = await prisma.leaveRequest.findUnique({ where: { id }, include: { leaveType: true } })
  if (!request) throw new NotFoundError("Leave request not found")
  if (request.employeeId !== viewer.employeeId) throw new ForbiddenError()
  if (!["PENDING", "MANAGER_APPROVED", "APPROVED"].includes(request.status)) {
    throw new ValidationError("This request can no longer be cancelled")
  }

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } })

    if (request.status === "APPROVED" && request.leaveType.isPaid) {
      const year = request.startDate.getUTCFullYear()
      await tx.leaveBalance.updateMany({
        where: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year },
        data: { used: { decrement: request.days } },
      })
    }
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "LEAVE_CANCELLED",
    entityType: "LeaveRequest",
    entityId: id,
    ...meta,
  })
}
