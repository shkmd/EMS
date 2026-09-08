import "server-only"

import { prisma } from "@/lib/prisma"
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import { notifyUser } from "@/lib/notify"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canActAsHr, canActAsManager } from "@/features/permission/authorization"
import { getManagedVerticalIds } from "@/features/verticals/scope"
import { hoursBetween } from "@/features/permission/lib/time"
import type { ApplyPermissionInput, PermissionActionInput, RecordPermissionInput } from "@/features/permission/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

async function notifyHrUsers(title: string, message: string, link: string) {
  const hrUsers = await prisma.user.findMany({
    where: { role: { in: ["HR", "SUPER_ADMIN"] }, isActive: true },
    select: { id: true, employee: { select: { id: true } } },
  })
  await Promise.all(hrUsers.map((u) => notifyUser(u.id, u.employee?.id ?? null, title, message, link)))
}

export async function applyPermission(input: ApplyPermissionInput, viewer: AccessTokenPayload, meta: Meta) {
  if (!viewer.employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")

  const employee = await prisma.employee.findUnique({
    where: { id: viewer.employeeId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, reportingManagerId: true },
  })
  if (!employee) throw new NotFoundError("Employee not found")

  const hours = hoursBetween(input.fromTime, input.toTime)
  if (hours === null) throw new ValidationError("End time must be after start time, within 4 hours")

  const request = await prisma.permissionRequest.create({
    data: {
      employeeId: employee.id,
      date: new Date(input.date),
      fromTime: input.fromTime,
      toTime: input.toTime,
      hours,
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
        "Permission request awaiting your approval",
        `${applicantName} requested permission from ${input.fromTime} to ${input.toTime}.`,
        "/permission?tab=approvals"
      )
    }
  } else {
    await notifyHrUsers(
      "Permission request awaiting approval",
      `${applicantName} requested permission from ${input.fromTime} to ${input.toTime} and has no assigned manager.`,
      "/permission?tab=approvals"
    )
  }

  await recordAuditLog({
    userId: viewer.sub,
    action: "PERMISSION_APPLIED",
    entityType: "PermissionRequest",
    entityId: request.id,
    ...meta,
  })

  return request
}

export async function managerAction(id: string, input: PermissionActionInput, viewer: AccessTokenPayload, meta: Meta) {
  const request = await prisma.permissionRequest.findUnique({
    where: { id },
    include: { employee: true },
  })
  if (!request) throw new NotFoundError("Permission request not found")
  const managedVerticalIds = await getManagedVerticalIds(viewer)
  if (!canActAsManager(viewer, request, managedVerticalIds)) throw new ForbiddenError()
  if (request.status !== "PENDING") {
    throw new ValidationError("This request has already been actioned")
  }

  const managerEmployeeId = viewer.employeeId ?? null

  const claim = await prisma.permissionRequest.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: input.action === "APPROVE" ? "MANAGER_APPROVED" : "REJECTED",
      managerId: managerEmployeeId,
      managerActionAt: new Date(),
      managerComment: input.comment || null,
    },
  })
  if (claim.count === 0) {
    throw new ValidationError("This request has already been actioned")
  }
  const updated = await prisma.permissionRequest.findUniqueOrThrow({ where: { id } })

  const employeeName = `${request.employee.firstName} ${request.employee.lastName}`

  if (input.action === "APPROVE") {
    await notifyHrUsers(
      "Permission request awaiting final approval",
      `${employeeName}'s permission request was approved by their manager and needs HR sign-off.`,
      "/permission?tab=approvals"
    )
  } else if (request.employee.userId) {
    await notifyUser(
      request.employee.userId,
      request.employeeId,
      "Permission request rejected",
      "Your permission request was rejected by your manager.",
      "/permission"
    )
  }

  await recordAuditLog({
    userId: viewer.sub,
    action: input.action === "APPROVE" ? "PERMISSION_MANAGER_APPROVED" : "PERMISSION_MANAGER_REJECTED",
    entityType: "PermissionRequest",
    entityId: id,
    ...meta,
  })

  return updated
}

export async function hrAction(id: string, input: PermissionActionInput, viewer: AccessTokenPayload, meta: Meta) {
  if (!canActAsHr(viewer.role)) throw new ForbiddenError()

  const request = await prisma.permissionRequest.findUnique({
    where: { id },
    include: { employee: true },
  })
  if (!request) throw new NotFoundError("Permission request not found")
  if (request.status !== "PENDING" && request.status !== "MANAGER_APPROVED") {
    throw new ValidationError("This request has already been actioned")
  }

  const hrEmployeeId = viewer.employeeId ?? null
  const approving = input.action === "APPROVE"

  const claim = await prisma.permissionRequest.updateMany({
    where: { id, status: request.status },
    data: {
      status: approving ? "APPROVED" : "REJECTED",
      hrId: hrEmployeeId,
      hrActionAt: new Date(),
      hrComment: input.comment || null,
    },
  })
  if (claim.count === 0) {
    throw new ValidationError("This request has already been actioned")
  }
  const updated = await prisma.permissionRequest.findUniqueOrThrow({ where: { id } })

  if (request.employee.userId) {
    await notifyUser(
      request.employee.userId,
      request.employeeId,
      approving ? "Permission request approved" : "Permission request rejected",
      approving
        ? `Your permission request (${request.hours} hour(s)) has been approved.`
        : "Your permission request was rejected by HR.",
      "/permission"
    )
  }

  await recordAuditLog({
    userId: viewer.sub,
    action: approving ? "PERMISSION_HR_APPROVED" : "PERMISSION_HR_REJECTED",
    entityType: "PermissionRequest",
    entityId: id,
    ...meta,
  })

  return updated
}

export async function cancelPermission(id: string, viewer: AccessTokenPayload, meta: Meta) {
  const request = await prisma.permissionRequest.findUnique({ where: { id } })
  if (!request) throw new NotFoundError("Permission request not found")
  if (request.employeeId !== viewer.employeeId) throw new ForbiddenError()
  if (!["PENDING", "MANAGER_APPROVED", "APPROVED"].includes(request.status)) {
    throw new ValidationError("This request can no longer be cancelled")
  }

  const claim = await prisma.permissionRequest.updateMany({
    where: { id, status: request.status },
    data: { status: "CANCELLED" },
  })
  if (claim.count === 0) {
    throw new ValidationError("This request can no longer be cancelled")
  }

  await recordAuditLog({
    userId: viewer.sub,
    action: "PERMISSION_CANCELLED",
    entityType: "PermissionRequest",
    entityId: id,
    ...meta,
  })
}

/** HR/Admin-direct logging — for when an employee asked verbally rather than
 * through the app. Mirrors createLeaveRequestForEmployee: same request shape,
 * just created (typically pre-approved) on the employee's behalf. */
export async function recordPermissionForEmployee(input: RecordPermissionInput, viewer: AccessTokenPayload, meta: Meta) {
  if (!canActAsHr(viewer.role)) throw new ForbiddenError()

  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId, deletedAt: null },
    select: { id: true },
  })
  if (!employee) throw new NotFoundError("Employee not found")

  const hours = hoursBetween(input.fromTime, input.toTime)
  if (hours === null) throw new ValidationError("End time must be after start time, within 4 hours")

  const hrEmployeeId = viewer.employeeId ?? null

  const created = await prisma.permissionRequest.create({
    data: {
      employeeId: employee.id,
      date: new Date(input.date),
      fromTime: input.fromTime,
      toTime: input.toTime,
      hours,
      reason: input.reason,
      status: input.status,
      ...(input.status === "APPROVED" ? { hrId: hrEmployeeId, hrActionAt: new Date() } : {}),
    },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "PERMISSION_RECORDED",
    entityType: "PermissionRequest",
    entityId: created.id,
    metadata: { employeeId: employee.id, status: input.status },
    ...meta,
  })

  return created
}

/** HR-only permanent removal — for erroneous or duplicate entries, distinct
 * from cancelPermission (which just changes status and keeps the record).
 * Unlike deleteLeaveRequest, there's no balance to reverse. */
export async function deletePermissionRequest(id: string, viewer: AccessTokenPayload, meta: Meta) {
  if (!canActAsHr(viewer.role)) throw new ForbiddenError()

  const existing = await prisma.permissionRequest.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Permission request not found")

  await prisma.permissionRequest.delete({ where: { id } })

  await recordAuditLog({
    userId: viewer.sub,
    action: "PERMISSION_REQUEST_DELETED",
    entityType: "PermissionRequest",
    entityId: id,
    metadata: { employeeId: existing.employeeId, status: existing.status },
    ...meta,
  })
}
