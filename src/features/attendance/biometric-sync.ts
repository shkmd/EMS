import "server-only"

import { differenceInMinutes } from "date-fns"

import { prisma } from "@/lib/prisma"
import { toUtcDateOnly, utcDayRange } from "@/lib/date-only"
import { ValidationError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import { getWorkingHoursForEmployee } from "@/features/verticals/queries"

export async function findEmployeeByBiometricId(biometricId: string) {
  const employee = await prisma.employee.findUnique({
    where: { biometricId },
    select: { id: true, status: true },
  })
  if (!employee) throw new NotFoundError(`No employee is mapped to biometric ID ${biometricId}`)
  if (employee.status !== "ACTIVE") {
    throw new ValidationError(`Employee mapped to biometric ID ${biometricId} is not active`)
  }
  return employee
}

/**
 * Records a fingerprint punch relayed by the office biometric-device bridge.
 * Unlike the self-service check-in/out mutations, this is driven by the
 * punch's own timestamp (not "now") and must be safe to call more than once
 * for the same physical scan — the bridge polls the device log and may
 * resend a punch it already delivered. An IN punch only ever sets the day's
 * first check-in (later IN scans that day are no-ops); an OUT punch keeps
 * pushing the check-out time forward, so replays and multiple out-scans are
 * both harmless.
 */
export async function recordBiometricPunch(employeeId: string, direction: "IN" | "OUT", punchTime: Date) {
  const { start, end } = utcDayRange(punchTime)

  const existing = await prisma.attendance.findFirst({
    where: { employeeId, date: { gte: start, lte: end } },
  })

  if (direction === "IN") {
    if (existing?.checkIn) return existing

    const attendance = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data: { checkIn: punchTime, status: "PRESENT" },
        })
      : await prisma.attendance.create({
          data: { employeeId, date: toUtcDateOnly(punchTime), status: "PRESENT", checkIn: punchTime },
        })

    await recordAuditLog({
      action: "ATTENDANCE_BIOMETRIC_CHECK_IN",
      entityType: "Attendance",
      entityId: attendance.id,
      metadata: { employeeId, punchTime: punchTime.toISOString() },
    })
    return attendance
  }

  if (!existing || !existing.checkIn) {
    throw new ValidationError("Received a check-out punch with no matching check-in for the day")
  }
  if (punchTime <= existing.checkIn) {
    return existing
  }

  const totalMinutes = differenceInMinutes(punchTime, existing.checkIn)
  const workingMinutes = Math.max(0, totalMinutes - existing.breakMinutes)

  const settings = await getWorkingHoursForEmployee(employeeId)
  const halfDayMinutes = Number(settings.halfDayHours) * 60
  const isHalfDay = existing.status === "PRESENT" && workingMinutes < halfDayMinutes

  const attendance = await prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOut: punchTime, workingMinutes, status: isHalfDay ? "HALF_DAY" : existing.status },
  })

  await recordAuditLog({
    action: "ATTENDANCE_BIOMETRIC_CHECK_OUT",
    entityType: "Attendance",
    entityId: attendance.id,
    metadata: { employeeId, punchTime: punchTime.toISOString() },
  })
  return attendance
}
