import "server-only"

import { prisma } from "@/lib/prisma"
import { utcDayRange } from "@/lib/date-only"
import { zonedTimeToUtc } from "@/lib/timezone"
import { notifyUser } from "@/lib/notify"
import { getCompanySettings } from "@/features/settings/queries"
import { getWorkingHoursForEmployee } from "@/features/verticals/queries"

const NUDGE_BUFFER_MINUTES = 30
// Matches the cron cadence this runs on (every 30 min) — wide enough that
// one tick is guaranteed to land in the window, narrow enough that the
// same person is never nudged twice for the same shift start.
const CHECK_WINDOW_MINUTES = 30

function todayInTimeZone(timeZone: string) {
  // en-CA formats as YYYY-MM-DD, exactly what zonedTimeToUtc expects.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date())
}

function weekdayCodeInTimeZone(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(new Date()).slice(0, 3).toUpperCase()
}

/** Nudges (in-app + email + WhatsApp + push, via the shared notifyUser fan-
 * out) any active employee who hasn't checked in 30 minutes after their
 * shift's configured start time, on a day their schedule has them working.
 * Meant to be called every 30 minutes during business hours — the narrow
 * per-employee time window means each person gets exactly one nudge per
 * shift, not one per cron tick. */
export async function nudgeMissingCheckIns() {
  const { timezone } = await getCompanySettings()
  const now = new Date()
  const todayStr = todayInTimeZone(timezone)
  const todayCode = weekdayCodeInTimeZone(timezone)

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, status: "ACTIVE", userId: { not: null } },
    select: { id: true, userId: true },
  })
  if (employees.length === 0) return { nudged: 0 }

  const { start, end } = utcDayRange()
  const alreadyMarked = await prisma.attendance.findMany({
    where: { date: { gte: start, lte: end }, employeeId: { in: employees.map((e) => e.id) } },
    select: { employeeId: true },
  })
  const markedIds = new Set(alreadyMarked.map((a) => a.employeeId))

  let nudged = 0

  for (const employee of employees) {
    if (markedIds.has(employee.id)) continue

    const hours = await getWorkingHoursForEmployee(employee.id)
    const workingDays = (hours.workingDays as string[] | undefined) ?? []
    if (!workingDays.includes(todayCode)) continue

    const shiftStart = zonedTimeToUtc(todayStr, hours.startTime, timezone)
    const windowStart = new Date(shiftStart.getTime() + NUDGE_BUFFER_MINUTES * 60_000)
    const windowEnd = new Date(windowStart.getTime() + CHECK_WINDOW_MINUTES * 60_000)

    if (now >= windowStart && now < windowEnd) {
      await notifyUser(
        employee.userId!,
        employee.id,
        "You haven't checked in yet",
        `It's been ${NUDGE_BUFFER_MINUTES} minutes past your shift start and you haven't checked in today.`,
        "/attendance"
      )
      nudged++
    }
  }

  return { nudged }
}
