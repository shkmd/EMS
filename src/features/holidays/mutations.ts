import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageHolidays } from "@/features/holidays/authorization"
import type { HolidayFormInput } from "@/features/holidays/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageHolidays(viewer.role)) throw new ForbiddenError()
}

function toData(input: HolidayFormInput) {
  return {
    name: input.name,
    date: new Date(input.date),
    type: input.type,
    description: input.description && input.description.trim() !== "" ? input.description : null,
  }
}

export async function createHoliday(input: HolidayFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  try {
    const holiday = await prisma.holiday.create({ data: toData(input) })
    await recordAuditLog({
      userId: viewer.sub,
      action: "HOLIDAY_CREATED",
      entityType: "Holiday",
      entityId: holiday.id,
      ...meta,
    })
    return holiday
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("A holiday with this name and date already exists")
    }
    throw error
  }
}

export async function updateHoliday(id: string, input: HolidayFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.holiday.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Holiday not found")

  try {
    const holiday = await prisma.holiday.update({ where: { id }, data: toData(input) })
    await recordAuditLog({
      userId: viewer.sub,
      action: "HOLIDAY_UPDATED",
      entityType: "Holiday",
      entityId: id,
      ...meta,
    })
    return holiday
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("A holiday with this name and date already exists")
    }
    throw error
  }
}

export async function deleteHoliday(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.holiday.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Holiday not found")

  await prisma.holiday.delete({ where: { id } })

  await recordAuditLog({
    userId: viewer.sub,
    action: "HOLIDAY_DELETED",
    entityType: "Holiday",
    entityId: id,
    ...meta,
  })
}
