import "server-only"

import { prisma } from "@/lib/prisma"
import { getWorkingHoursForEmployee } from "@/features/verticals/queries"

const WEEKDAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const

/**
 * Counts working days in [startDate, endDate] (inclusive), excluding
 * weekends (per the employee's Vertical working hours, or the global
 * default if they're not assigned one) and PUBLIC/COMPANY holidays.
 * Dates must be UTC-midnight-normalized `@db.Date` values — every
 * comparison here is done in UTC terms to match (see src/lib/date-only.ts).
 */
export async function calculateLeaveDays(
  startDate: Date,
  endDate: Date,
  duration: "FULL_DAY" | "FIRST_HALF" | "SECOND_HALF",
  employeeId?: string | null
): Promise<number> {
  if (duration !== "FULL_DAY") return 0.5

  const [settings, holidays] = await Promise.all([
    getWorkingHoursForEmployee(employeeId),
    prisma.holiday.findMany({
      where: { date: { gte: startDate, lte: endDate }, type: { in: ["PUBLIC", "COMPANY"] } },
      select: { date: true },
    }),
  ])

  const workingDays = (settings?.workingDays as string[] | undefined) ?? ["MON", "TUE", "WED", "THU", "FRI"]
  const holidayDates = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)))

  let count = 0
  const cursor = new Date(startDate)
  while (cursor <= endDate) {
    const code = WEEKDAY_CODES[cursor.getUTCDay()]
    const iso = cursor.toISOString().slice(0, 10)
    if (workingDays.includes(code) && !holidayDates.has(iso)) count++
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return count
}
