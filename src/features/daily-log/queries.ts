import "server-only"

import { prisma } from "@/lib/prisma"
import { utcDayRange, toUtcDateOnly } from "@/lib/date-only"
import { ForbiddenError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canViewTeamAttendance } from "@/features/attendance/authorization"
import type { DailyTaskReportQuery } from "@/features/daily-log/schemas"

export async function getMyDailyLogToday(employeeId: string) {
  const { start, end } = utcDayRange()
  return prisma.dailyLog.findFirst({ where: { employeeId, date: { gte: start, lte: end } } })
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export type DailyTaskReportRow = {
  employeeId: string
  employeeCode: string
  firstName: string
  lastName: string
  department: string | null
  date: string
  update: string | null
  taskActivity: string | null
}

/** One row per employee per day (within range) that has either a daily
 * update or task activity — combines the free-text log with a summary of
 * that day's Task status/comment activity, driven off the same
 * TaskActivity audit trail the Projects module already writes to. */
export async function getDailyTaskReport(
  filters: DailyTaskReportQuery,
  viewer: AccessTokenPayload
): Promise<DailyTaskReportRow[]> {
  if (!canViewTeamAttendance(viewer.role)) throw new ForbiddenError()

  const employeeScope = viewer.role === "MANAGER" ? { reportingManagerId: viewer.employeeId } : {}

  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      ...employeeScope,
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.employeeId ? { id: filters.employeeId } : {}),
    },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      userId: true,
      department: { select: { name: true } },
    },
  })
  if (employees.length === 0) return []

  const employeeIds = employees.map((e) => e.id)
  const userIdToEmployee = new Map(employees.filter((e) => e.userId).map((e) => [e.userId!, e]))
  const employeeById = new Map(employees.map((e) => [e.id, e]))

  const dateStart = toUtcDateOnly(new Date(filters.dateFrom))
  const dateEnd = toUtcDateOnly(new Date(filters.dateTo))
  const dateEndExclusive = new Date(dateEnd)
  dateEndExclusive.setUTCDate(dateEndExclusive.getUTCDate() + 1)

  const [dailyLogs, activities] = await Promise.all([
    prisma.dailyLog.findMany({
      where: { employeeId: { in: employeeIds }, date: { gte: dateStart, lte: dateEnd } },
      select: { employeeId: true, date: true, note: true },
    }),
    prisma.taskActivity.findMany({
      where: {
        actorId: { in: [...userIdToEmployee.keys()] },
        createdAt: { gte: dateStart, lt: dateEndExclusive },
      },
      select: { actorId: true, createdAt: true, message: true, task: { select: { title: true } } },
    }),
  ])

  const rowsByKey = new Map<string, DailyTaskReportRow>()

  function getOrCreateRow(employeeId: string, key: string) {
    const existing = rowsByKey.get(key)
    if (existing) return existing
    const e = employeeById.get(employeeId)!
    const row: DailyTaskReportRow = {
      employeeId: e.id,
      employeeCode: e.employeeCode,
      firstName: e.firstName,
      lastName: e.lastName,
      department: e.department?.name ?? null,
      date: key.split("|")[1]!,
      update: null,
      taskActivity: null,
    }
    rowsByKey.set(key, row)
    return row
  }

  for (const log of dailyLogs) {
    const key = `${log.employeeId}|${dateKey(log.date)}`
    getOrCreateRow(log.employeeId, key).update = log.note
  }

  for (const activity of activities) {
    const employee = userIdToEmployee.get(activity.actorId)
    if (!employee) continue
    const key = `${employee.id}|${dateKey(toUtcDateOnly(activity.createdAt))}`
    const row = getOrCreateRow(employee.id, key)
    const entry = `${activity.task.title} — ${activity.message}`
    row.taskActivity = row.taskActivity ? `${row.taskActivity}; ${entry}` : entry
  }

  return [...rowsByKey.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || a.firstName.localeCompare(b.firstName)
  )
}
