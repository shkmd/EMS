import { differenceInMinutes } from "date-fns"

import { zonedTimeToUtc } from "@/lib/timezone"

/** Minutes late for a check-in relative to the employee's (vertical or
 * global) working hours + grace period, in the company's timezone. 0 if
 * there's no check-in or they were on time/early. */
export function getLateMinutes(
  checkIn: Date | null,
  date: Date,
  hours: { startTime: string; graceMinutes: number },
  timezone: string
): number {
  if (!checkIn) return 0

  const dateStr = date.toISOString().slice(0, 10)
  const threshold = zonedTimeToUtc(dateStr, hours.startTime, timezone)
  threshold.setUTCMinutes(threshold.getUTCMinutes() + hours.graceMinutes)

  return Math.max(0, differenceInMinutes(checkIn, threshold))
}
