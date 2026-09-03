import "server-only"

import { differenceInMinutes } from "date-fns"
import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { toUtcDateOnly, utcDayRange } from "@/lib/date-only"
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageAttendance } from "@/features/attendance/authorization"
import { isIpAllowed } from "@/features/attendance/lib/ip-allowlist"
import { getWorkingHoursForEmployee } from "@/features/verticals/queries"
import { getCompanySettings } from "@/features/settings/queries"
import { zonedTimeToUtc } from "@/lib/timezone"
import { LEAVE_CODE_ATTENDANCE_STATUSES, type ManualAttendanceInput } from "@/features/attendance/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

const LEAVE_CODE_STATUS_SET: ReadonlySet<string> = new Set(LEAVE_CODE_ATTENDANCE_STATUSES)

// Marking a day CL/SL/EL/LOP directly in attendance also moves that leave
// type's balance, same as an approved leave request would — 1 attendance
// row is always exactly 1 day. `direction` is +1 when applying, -1 when
// reversing (status changed away from a leave code, or the record was
// deleted). Unpaid types (LOP) carry no tracked balance, matching how
// leave requests already skip balance math for `!leaveType.isPaid`.
async function adjustLeaveBalanceForAttendance(
  tx: Prisma.TransactionClient,
  employeeId: string,
  statusCode: string,
  date: Date,
  direction: 1 | -1
) {
  const leaveType = await tx.leaveType.findUnique({ where: { code: statusCode } })
  if (!leaveType || !leaveType.isPaid) return

  const year = date.getUTCFullYear()

  if (direction === 1) {
    await tx.leaveBalance.upsert({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId: leaveType.id, year } },
      update: { used: { increment: 1 } },
      create: { employeeId, leaveTypeId: leaveType.id, year, allocated: leaveType.defaultDaysPerYear, used: 1 },
    })
  } else {
    await tx.leaveBalance.updateMany({
      where: { employeeId, leaveTypeId: leaveType.id, year },
      data: { used: { decrement: 1 } },
    })
  }
}

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

async function assertCheckInAllowedFromIp(employeeId: string, ipAddress: string | null | undefined) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { workMode: true, vertical: { select: { officeIpAllowlist: true } } },
  })

  if (employee?.workMode === "OFFICE" && !isIpAllowed(ipAddress, employee.vertical?.officeIpAllowlist)) {
    throw new ValidationError(
      "You must be connected to the office network to check in. If you work from home, ask HR to update your work mode."
    )
  }
}

export async function checkIn(viewer: AccessTokenPayload, asWorkFromHome: boolean, meta: Meta) {
  const employeeId = requireSelfEmployeeId(viewer)
  await assertCheckInAllowedFromIp(employeeId, meta.ipAddress)

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

  // checkIn/checkOut are wall-clock "HH:mm" values meant in the company's
  // configured timezone, not the server's (always UTC in this app's
  // containers) — parse them accordingly, or a manager in Asia/Kolkata
  // entering "09:00" ends up with a record reading 14:30 IST.
  const { timezone } = await getCompanySettings()
  const checkIn = input.checkIn ? zonedTimeToUtc(input.date, input.checkIn, timezone) : null
  const checkOutAt = input.checkOut ? zonedTimeToUtc(input.date, input.checkOut, timezone) : null
  const workingMinutes = checkIn && checkOutAt ? Math.max(0, differenceInMinutes(checkOutAt, checkIn)) : 0

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: input.employeeId, date } },
  })

  const record = await prisma.$transaction(async (tx) => {
    if (existing && LEAVE_CODE_STATUS_SET.has(existing.status)) {
      await adjustLeaveBalanceForAttendance(tx, input.employeeId, existing.status, date, -1)
    }

    const saved = await tx.attendance.upsert({
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

    if (LEAVE_CODE_STATUS_SET.has(input.status)) {
      await adjustLeaveBalanceForAttendance(tx, input.employeeId, input.status, date, 1)
    }

    return saved
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

  await prisma.$transaction(async (tx) => {
    if (LEAVE_CODE_STATUS_SET.has(existing.status)) {
      await adjustLeaveBalanceForAttendance(tx, existing.employeeId, existing.status, existing.date, -1)
    }
    await tx.attendance.delete({ where: { id } })
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "ATTENDANCE_DELETED",
    entityType: "Attendance",
    entityId: id,
    ...meta,
  })
}
