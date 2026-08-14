import "server-only"

import { format } from "date-fns"

import { prisma } from "@/lib/prisma"
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageEmployees } from "@/features/employees/authorization"
import type { InitiateOffboardingInput, UpdateOffboardingChecklistInput } from "@/features/offboarding/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageEmployees(viewer.role)) throw new ForbiddenError()
}

export async function initiateOffboarding(
  employeeId: string,
  input: InitiateOffboardingInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  assertCanManage(viewer)

  const employee = await prisma.employee.findUnique({ where: { id: employeeId, deletedAt: null } })
  if (!employee) throw new NotFoundError("Employee not found")

  const existing = await prisma.offboarding.findFirst({ where: { employeeId, status: "IN_PROGRESS" } })
  if (existing) throw new ValidationError("This employee already has an offboarding in progress")

  const lastWorkingDay = new Date(input.lastWorkingDay)

  const offboarding = await prisma.$transaction(async (tx) => {
    const created = await tx.offboarding.create({
      data: {
        employeeId,
        resignationDate: input.resignationDate ? new Date(input.resignationDate) : null,
        lastWorkingDay,
        reason: input.reason,
        reasonNotes: input.reasonNotes || null,
        initiatedById: viewer.sub,
      },
    })

    await tx.employeeTimelineEvent.create({
      data: {
        employeeId,
        type: "OFFBOARDING_INITIATED",
        title: "Offboarding initiated",
        description: `Last working day: ${format(lastWorkingDay, "dd MMM yyyy")}`,
        eventDate: new Date(),
      },
    })

    return created
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "OFFBOARDING_INITIATED",
    entityType: "Offboarding",
    entityId: offboarding.id,
    metadata: { employeeId },
    ...meta,
  })

  return offboarding
}

export async function updateOffboardingChecklist(
  id: string,
  input: UpdateOffboardingChecklistInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  assertCanManage(viewer)

  const existing = await prisma.offboarding.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Offboarding not found")
  if (existing.status !== "IN_PROGRESS") throw new ValidationError("This offboarding is no longer in progress")

  const updated = await prisma.offboarding.update({
    where: { id },
    data: {
      duesCleared: input.duesCleared,
      handoverComplete: input.handoverComplete,
      handoverNotes: input.handoverNotes || null,
    },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "OFFBOARDING_CHECKLIST_UPDATED",
    entityType: "Offboarding",
    entityId: id,
    ...meta,
  })

  return updated
}

export async function completeOffboarding(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.offboarding.findUnique({ where: { id }, include: { employee: true } })
  if (!existing) throw new NotFoundError("Offboarding not found")
  if (existing.status !== "IN_PROGRESS") throw new ValidationError("This offboarding is no longer in progress")

  const outstandingAssets = await prisma.assetAssignment.count({
    where: { employeeId: existing.employeeId, status: "ASSIGNED" },
  })
  if (outstandingAssets > 0) {
    throw new ValidationError("All assigned assets must be returned before completing offboarding")
  }
  if (!existing.duesCleared) throw new ValidationError("Dues must be marked cleared before completing offboarding")
  if (!existing.handoverComplete) throw new ValidationError("Handover must be marked complete before completing offboarding")

  await prisma.$transaction(async (tx) => {
    await tx.offboarding.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } })
    await tx.employee.update({ where: { id: existing.employeeId }, data: { status: "TERMINATED" } })

    if (existing.employee.userId) {
      await tx.user.update({ where: { id: existing.employee.userId }, data: { isActive: false } })
      await tx.refreshToken.updateMany({
        where: { userId: existing.employee.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }

    await tx.employeeTimelineEvent.create({
      data: {
        employeeId: existing.employeeId,
        type: "OFFBOARDED",
        title: "Offboarding completed",
        description: `Last working day: ${format(existing.lastWorkingDay, "dd MMM yyyy")}`,
        eventDate: new Date(),
      },
    })
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "OFFBOARDING_COMPLETED",
    entityType: "Offboarding",
    entityId: id,
    metadata: { employeeId: existing.employeeId },
    ...meta,
  })
}

export async function cancelOffboarding(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.offboarding.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Offboarding not found")
  if (existing.status !== "IN_PROGRESS") throw new ValidationError("This offboarding is no longer in progress")

  await prisma.$transaction(async (tx) => {
    await tx.offboarding.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } })
    await tx.employeeTimelineEvent.create({
      data: {
        employeeId: existing.employeeId,
        type: "OFFBOARDING_CANCELLED",
        title: "Offboarding cancelled",
        eventDate: new Date(),
      },
    })
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "OFFBOARDING_CANCELLED",
    entityType: "Offboarding",
    entityId: id,
    metadata: { employeeId: existing.employeeId },
    ...meta,
  })
}
