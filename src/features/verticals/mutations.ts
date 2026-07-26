import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageVerticals } from "@/features/verticals/authorization"
import type { VerticalFormInput } from "@/features/verticals/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageVerticals(viewer.role)) throw new ForbiddenError()
}

function toVerticalData(input: VerticalFormInput) {
  return {
    name: input.name,
    startTime: input.startTime,
    endTime: input.endTime,
    workingDays: input.workingDays,
    graceMinutes: Number(input.graceMinutes),
    halfDayHours: Number(input.halfDayHours),
    fullDayHours: Number(input.fullDayHours),
  }
}

export async function createVertical(input: VerticalFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  try {
    const vertical = await prisma.vertical.create({ data: toVerticalData(input) })
    await recordAuditLog({ userId: viewer.sub, action: "VERTICAL_CREATED", entityType: "Vertical", entityId: vertical.id, ...meta })
    return vertical
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("A vertical with this name already exists")
    }
    throw error
  }
}

export async function updateVertical(id: string, input: VerticalFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.vertical.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Vertical not found")

  try {
    const vertical = await prisma.vertical.update({ where: { id }, data: toVerticalData(input) })
    await recordAuditLog({ userId: viewer.sub, action: "VERTICAL_UPDATED", entityType: "Vertical", entityId: id, ...meta })
    return vertical
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("A vertical with this name already exists")
    }
    throw error
  }
}

export async function deleteVertical(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.vertical.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Vertical not found")

  const employeeCount = await prisma.employee.count({ where: { verticalId: id, deletedAt: null } })
  if (employeeCount > 0) {
    throw new ValidationError("This vertical has employees assigned and can't be deleted")
  }

  await prisma.vertical.delete({ where: { id } })

  await recordAuditLog({ userId: viewer.sub, action: "VERTICAL_DELETED", entityType: "Vertical", entityId: id, ...meta })
}
