import "server-only"

import { prisma } from "@/lib/prisma"
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageEmployees } from "@/features/employees/authorization"
import type { UpdateOnboardingChecklistInput } from "@/features/onboarding/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageEmployees(viewer.role)) throw new ForbiddenError()
}

export async function initiateOnboarding(employeeId: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const employee = await prisma.employee.findUnique({ where: { id: employeeId, deletedAt: null } })
  if (!employee) throw new NotFoundError("Employee not found")

  const existing = await prisma.onboarding.findFirst({ where: { employeeId, status: "IN_PROGRESS" } })
  if (existing) throw new ValidationError("This employee already has onboarding in progress")

  const onboarding = await prisma.$transaction(async (tx) => {
    const created = await tx.onboarding.create({ data: { employeeId, initiatedById: viewer.sub } })

    await tx.employeeTimelineEvent.create({
      data: {
        employeeId,
        type: "ONBOARDING_INITIATED",
        title: "Onboarding started",
        eventDate: new Date(),
      },
    })

    return created
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "ONBOARDING_INITIATED",
    entityType: "Onboarding",
    entityId: onboarding.id,
    metadata: { employeeId },
    ...meta,
  })

  return onboarding
}

export async function updateOnboardingChecklist(
  id: string,
  input: UpdateOnboardingChecklistInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  assertCanManage(viewer)

  const existing = await prisma.onboarding.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Onboarding not found")
  if (existing.status !== "IN_PROGRESS") throw new ValidationError("This onboarding is no longer in progress")

  const updated = await prisma.onboarding.update({
    where: { id },
    data: {
      documentsCollected: input.documentsCollected,
      documentsNotes: input.documentsNotes || null,
      orientationComplete: input.orientationComplete,
      orientationNotes: input.orientationNotes || null,
    },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "ONBOARDING_CHECKLIST_UPDATED",
    entityType: "Onboarding",
    entityId: id,
    ...meta,
  })

  return updated
}

export async function completeOnboarding(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.onboarding.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Onboarding not found")
  if (existing.status !== "IN_PROGRESS") throw new ValidationError("This onboarding is no longer in progress")
  if (!existing.documentsCollected) throw new ValidationError("Documents must be marked collected before completing onboarding")
  if (!existing.orientationComplete) throw new ValidationError("Orientation must be marked complete before completing onboarding")

  await prisma.$transaction(async (tx) => {
    await tx.onboarding.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } })
    await tx.employeeTimelineEvent.create({
      data: {
        employeeId: existing.employeeId,
        type: "ONBOARDED",
        title: "Onboarding completed",
        eventDate: new Date(),
      },
    })
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "ONBOARDING_COMPLETED",
    entityType: "Onboarding",
    entityId: id,
    metadata: { employeeId: existing.employeeId },
    ...meta,
  })
}

export async function cancelOnboarding(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.onboarding.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Onboarding not found")
  if (existing.status !== "IN_PROGRESS") throw new ValidationError("This onboarding is no longer in progress")

  await prisma.$transaction(async (tx) => {
    await tx.onboarding.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } })
    await tx.employeeTimelineEvent.create({
      data: {
        employeeId: existing.employeeId,
        type: "ONBOARDING_CANCELLED",
        title: "Onboarding cancelled",
        eventDate: new Date(),
      },
    })
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "ONBOARDING_CANCELLED",
    entityType: "Onboarding",
    entityId: id,
    metadata: { employeeId: existing.employeeId },
    ...meta,
  })
}
