import "server-only"

import { differenceInMinutes } from "date-fns"

import { prisma } from "@/lib/prisma"
import { toUtcDateOnly, utcDayRange } from "@/lib/date-only"
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageAttendance } from "@/features/attendance/authorization"
import { getWorkingHoursForEmployee } from "@/features/verticals/queries"
import type { ManualAttendanceInput } from "@/features/attendance/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function requireSelfEmployeeId(viewer: AccessTokenPayload) {
  if (!viewer.employeeId) {
    throw new ValidationError("Your account isn't linked to an employee profile yet")
  }
  return viewer.employeeId
}

async function findOrCreateTodayAttendance(employeeId: string, status: "PRESENT" | "WORK_FROM_HOME") {
  const { start, end } = utcDayRange()

  const existing = await prisma.attendance.findFirst({
    where: { employeeId, date: { gte: start, lte: end } },
  })
  if (existing) return existing

  return prisma.attendance.create({
    data: { employeeId, date: toUtcDateOnly(), status },
  })
}

export async function checkIn(viewer: AccessTokenPayload, asWorkFromHome: boolean, meta: Meta) {
  const employeeId = requireSelfEmployeeId(viewer)
  const attendance = await findOrCreateTodayAttendance(employeeId, asWorkFromHome ? "WORK_FROM_HOME" : "PRESENT")

  if (attendance.checkIn) {
    throw new ValidationError("You've already checked in today")
  }

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: { checkIn: new Date(), status: asWorkFromHome ? "WORK_FROM_HOME" : "PRESENT" },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "ATTENDANCE_CHECK_IN",
    entityType: "Attendance",
    entityId: updated.id,
    ...meta,
  })

  return updated
}

export async function checkOut(viewer: AccessTokenPayload, meta: Meta) {
  const employeeId = requireSelfEmployeeId(viewer)
  const { start, end } = utcDayRange()

  const attendance = await prisma.attendance.findFirst({
    where: { employeeId, date: { gte: start, lte: end } },
    include: { breaks: true },
  })
  if (!attendance || !attendance.checkIn) {
    throw new ValidationError("You need to check in before checking out")
  }
  if (attendance.checkOut) {
    throw new ValidationError("You've already checked out today")
  }
  if (attendance.breaks.some((b) => !b.breakEnd)) {
    throw new ValidationError("End your current break before checking out")
  }

  const now = new Date()
  const totalMinutes = differenceInMinutes(now, attendance.checkIn)
  const workingMinutes = Math.max(0, totalMinutes - attendance.breakMinutes)

  const settings = await getWorkingHoursForEmployee(employeeId)
  const halfDayMinutes = Number(settings.halfDayHours) * 60
  const isHalfDay = attendance.status === "PRESENT" && workingMinutes < halfDayMinutes

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      checkOut: now,
      workingMinutes,
      status: isHalfDay ? "HALF_DAY" : attendance.status,
    },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "ATTENDANCE_CHECK_OUT",
    entityType: "Attendance",
    entityId: updated.id,
    ...meta,
  })

  return updated
}

export async function startBreak(viewer: AccessTokenPayload, meta: Meta) {
  const employeeId = requireSelfEmployeeId(viewer)
  const { start, end } = utcDayRange()

  const attendance = await prisma.attendance.findFirst({
    where: { employeeId, date: { gte: start, lte: end } },
    include: { breaks: true },
  })
  if (!attendance || !attendance.checkIn) throw new ValidationError("Check in before starting a break")
  if (attendance.checkOut) throw new ValidationError("You've already checked out today")
  if (attendance.breaks.some((b) => !b.breakEnd)) throw new ValidationError("A break is already in progress")

  const brk = await prisma.attendanceBreak.create({
    data: { attendanceId: attendance.id, breakStart: new Date() },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "ATTENDANCE_BREAK_STARTED",
    entityType: "Attendance",
    entityId: attendance.id,
    ...meta,
  })

  return brk
}

export async function endBreak(viewer: AccessTokenPayload, meta: Meta) {
  const employeeId = requireSelfEmployeeId(viewer)
  const { start, end } = utcDayRange()

  const attendance = await prisma.attendance.findFirst({
    where: { employeeId, date: { gte: start, lte: end } },
    include: { breaks: { where: { breakEnd: null } } },
  })
  const openBreak = attendance?.breaks[0]
  if (!attendance || !openBreak) throw new ValidationError("No break in progress")

  const now = new Date()
  const elapsed = differenceInMinutes(now, openBreak.breakStart)

  const [, updatedAttendance] = await prisma.$transaction([
    prisma.attendanceBreak.update({ where: { id: openBreak.id }, data: { breakEnd: now } }),
    prisma.attendance.update({
      where: { id: attendance.id },
      data: { breakMinutes: attendance.breakMinutes + elapsed },
    }),
  ])

  await recordAuditLog({
    userId: viewer.sub,
    action: "ATTENDANCE_BREAK_ENDED",
    entityType: "Attendance",
    entityId: attendance.id,
    ...meta,
  })

  return updatedAttendance
}

export async function upsertManualAttendance(input: ManualAttendanceInput, viewer: AccessTokenPayload, meta: Meta) {
  if (!canManageAttendance(viewer.role)) throw new ForbiddenError()

  // input.date is a "YYYY-MM-DD" string, which the Date constructor already
  // parses as UTC midnight — exactly what the `@db.Date` column expects.
  // Do NOT wrap it in date-fns's startOfDay: that recomputes the boundary
  // in local time and can shift it a day off from what was intended.
  const date = new Date(input.date)
  const checkIn = input.checkIn ? new Date(`${input.date}T${input.checkIn}`) : null
  const checkOutAt = input.checkOut ? new Date(`${input.date}T${input.checkOut}`) : null
  const workingMinutes = checkIn && checkOutAt ? Math.max(0, differenceInMinutes(checkOutAt, checkIn)) : 0

  const record = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: input.employeeId, date } },
    update: { status: input.status, checkIn, checkOut: checkOutAt, workingMinutes, notes: input.notes || null },
    create: {
      employeeId: input.employeeId,
      date,
      status: input.status,
      checkIn,
      checkOut: checkOutAt,
      workingMinutes,
      notes: input.notes || null,
    },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "ATTENDANCE_MANUAL_ENTRY",
    entityType: "Attendance",
    entityId: record.id,
    metadata: { employeeId: input.employeeId, date: input.date },
    ...meta,
  })

  return record
}

export async function deleteAttendance(id: string, viewer: AccessTokenPayload, meta: Meta) {
  if (!canManageAttendance(viewer.role)) throw new ForbiddenError()

  const existing = await prisma.attendance.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Attendance record not found")

  await prisma.attendance.delete({ where: { id } })

  await recordAuditLog({
    userId: viewer.sub,
    action: "ATTENDANCE_DELETED",
    entityType: "Attendance",
    entityId: id,
    ...meta,
  })
}
