import "server-only"

import { format } from "date-fns"

import { prisma } from "@/lib/prisma"
import { utcDayRange, utcDateDaysAgo } from "@/lib/date-only"
import { ATTENDANCE_STATUS_LABELS } from "@/features/attendance/lib/status"

export async function listVerticals() {
  return prisma.vertical.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
}

/** Resolves which vertical (if any) an employee belongs to — used to lock non-admin viewers to their own vertical. */
export async function getEmployeeVerticalId(employeeId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { verticalId: true } })
  return employee?.verticalId ?? null
}

export async function getEmployeeStats(verticalId?: string) {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
  const verticalScope = verticalId ? { verticalId } : {}

  const [total, active, inactive, newThisMonth, departmentCount] = await Promise.all([
    prisma.employee.count({ where: { deletedAt: null, ...verticalScope } }),
    prisma.employee.count({ where: { deletedAt: null, status: "ACTIVE", ...verticalScope } }),
    prisma.employee.count({ where: { deletedAt: null, status: "INACTIVE", ...verticalScope } }),
    prisma.employee.count({ where: { deletedAt: null, dateOfJoining: { gte: monthStart }, ...verticalScope } }),
    verticalId
      ? prisma.department
          .findMany({
            where: { employees: { some: { deletedAt: null, verticalId } } },
            select: { id: true },
          })
          .then((d) => d.length)
      : prisma.department.count(),
  ])

  return { total, active, inactive, newThisMonth, departmentCount }
}

export async function getPendingLeaveRequestsCount(verticalId?: string) {
  return prisma.leaveRequest.count({
    where: {
      status: { in: ["PENDING", "MANAGER_APPROVED"] },
      employee: { deletedAt: null, ...(verticalId ? { verticalId } : {}) },
    },
  })
}

export async function getAttendanceToday(verticalId?: string) {
  const { start, end } = utcDayRange()
  const employeeScope = { deletedAt: null, ...(verticalId ? { verticalId } : {}) }

  const [present, totalActive] = await Promise.all([
    prisma.attendance.count({
      where: {
        date: { gte: start, lte: end },
        status: { in: ["PRESENT", "WORK_FROM_HOME", "HALF_DAY", "OUTDOOR_DUTY", "PERMISSION", "WORK_ON_HOLIDAY"] },
        employee: employeeScope,
      },
    }),
    prisma.employee.count({ where: { ...employeeScope, status: "ACTIVE" } }),
  ])

  return { present, totalActive }
}

// Birthdays/anniversaries filter by month-and-day in JS rather than a raw
// MONTH()/DAY() SQL query — simpler and DB-portable at the employee-count
// scales this dashboard targets; revisit with a raw query if that changes.
//
// dob/dateOfJoining are `@db.Date` columns, always UTC-midnight-normalized —
// so "now" must be read via its UTC fields (getUTCMonth/getUTCFullYear),
// not local ones, or the comparison silently disagrees near month/year
// boundaries in non-UTC timezones (the same bug class as the attendance
// check-in/out day-boundary issue — see src/lib/date-only.ts).
export async function getBirthdaysThisMonth(verticalId?: string) {
  const now = new Date()
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, status: "ACTIVE", dob: { not: null }, ...(verticalId ? { verticalId } : {}) },
    select: { id: true, firstName: true, lastName: true, dob: true, profilePhotoUrl: true },
  })

  return employees
    .filter((e) => e.dob!.getUTCMonth() === now.getUTCMonth())
    .sort((a, b) => a.dob!.getUTCDate() - b.dob!.getUTCDate())
    .map((e) => ({ ...e, day: e.dob!.getUTCDate() }))
}

export async function getWorkAnniversariesThisMonth(verticalId?: string) {
  const now = new Date()
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, status: "ACTIVE", ...(verticalId ? { verticalId } : {}) },
    select: { id: true, firstName: true, lastName: true, dateOfJoining: true, profilePhotoUrl: true },
  })

  return employees
    .filter(
      (e) => e.dateOfJoining.getUTCMonth() === now.getUTCMonth() && e.dateOfJoining.getUTCFullYear() < now.getUTCFullYear()
    )
    .map((e) => ({
      ...e,
      day: e.dateOfJoining.getUTCDate(),
      years: now.getUTCFullYear() - e.dateOfJoining.getUTCFullYear(),
    }))
    .sort((a, b) => a.day - b.day)
}

export async function getEmployeeGrowth(monthsBack = 6, verticalId?: string) {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, ...(verticalId ? { verticalId } : {}) },
    select: { dateOfJoining: true },
  })

  const now = new Date()
  const buckets: { month: string; count: number }[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthIndex = now.getUTCMonth() - i
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), monthIndex, 1))
    const cutoff = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1))
    const count = employees.filter((e) => e.dateOfJoining < cutoff).length
    buckets.push({ month: format(monthDate, "MMM yyyy"), count })
  }

  return buckets
}

export async function getDepartmentWiseEmployeeCounts(verticalId?: string) {
  const departments = await prisma.department.findMany({
    select: {
      name: true,
      _count: { select: { employees: { where: { deletedAt: null, ...(verticalId ? { verticalId } : {}) } } } },
    },
    orderBy: { name: "asc" },
  })

  return departments
    .map((d) => ({ department: d.name, count: d._count.employees }))
    .filter((d) => d.count > 0 || !verticalId)
}

export async function getAttendanceStatistics(daysBack = 14, verticalId?: string) {
  const since = utcDateDaysAgo(daysBack)

  const grouped = await prisma.attendance.groupBy({
    by: ["status"],
    where: { date: { gte: since }, employee: { deletedAt: null, ...(verticalId ? { verticalId } : {}) } },
    _count: { _all: true },
  })

  return grouped
    .map((g) => ({ status: ATTENDANCE_STATUS_LABELS[g.status] ?? g.status, count: g._count._all }))
    .sort((a, b) => b.count - a.count)
}

export async function getLeaveStatistics(verticalId?: string) {
  const grouped = await prisma.leaveRequest.groupBy({
    by: ["leaveTypeId"],
    where: { employee: { deletedAt: null, ...(verticalId ? { verticalId } : {}) } },
    _count: { _all: true },
  })

  const leaveTypes = await prisma.leaveType.findMany({ select: { id: true, name: true } })
  const nameById = new Map(leaveTypes.map((lt) => [lt.id, lt.name]))

  return grouped.map((g) => ({
    leaveType: nameById.get(g.leaveTypeId) ?? "Unknown",
    count: g._count._all,
  }))
}
