/**
 * Helpers for working with `@db.Date` columns (Attendance.date, Holiday.date,
 * Employee.dob, etc).
 *
 * Prisma's MySQL connector normalizes DATE columns by extracting the UTC
 * calendar day from whatever JS Date it's given — it ignores the Date's
 * time-of-day entirely. `date-fns`'s `startOfDay(new Date())` / `endOfDay`
 * compute *local*-time boundaries. On a server whose timezone isn't UTC,
 * those two notions of "today" disagree: a row written via
 * `startOfDay(new Date())` gets stored under a different UTC calendar day
 * than the one a same-moment `startOfDay(new Date())`/`endOfDay(new Date())`
 * WHERE-clause range actually matches against, silently missing rows that
 * very much should match (see the attendance check-in bug this fixed).
 *
 * Always use these helpers — never raw `date-fns` day boundaries — for any
 * comparison against a `@db.Date` column.
 */

/** Normalizes a Date to UTC midnight of its *local* calendar day. */
export function toUtcDateOnly(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

/** [start, end] instants spanning the local calendar day, in UTC terms. */
export function utcDayRange(date: Date = new Date()) {
  const start = toUtcDateOnly(date)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  end.setUTCMilliseconds(-1)
  return { start, end }
}

/** UTC-midnight instant `daysBack` local-calendar-days before now. */
export function utcDateDaysAgo(daysBack: number): Date {
  const d = toUtcDateOnly()
  d.setUTCDate(d.getUTCDate() - daysBack)
  return d
}

/** [start, end] instants spanning a given calendar month, in UTC terms. */
export function utcMonthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))
  end.setUTCMilliseconds(-1)
  return { start, end }
}

/** [start, end] instants spanning a given calendar year, in UTC terms. */
export function utcYearRange(year: number) {
  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year + 1, 0, 1))
  end.setUTCMilliseconds(-1)
  return { start, end }
}
