import "server-only"

import { format } from "date-fns"

import { prisma } from "@/lib/prisma"
import { utcDayRange, utcDateDaysAgo } from "@/lib/date-only"

export async function getEmployeeStats() {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))

  const [total, active, inactive, newThisMonth, departmentCount] = await Promise.all([
    prisma.employee.count({ where: { deletedAt: null } }),
    prisma.employee.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.employee.count({ where: { deletedAt: null, status: "INACTIVE" } }),
    prisma.employee.count({ where: { deletedAt: null, dateOfJoining: { gte: monthStart } } }),
    prisma.department.count(),
  ])

  return { total, active, inactive, newThisMonth, departmentCount }
}

export async function getPendingLeaveRequestsCount() {
  return prisma.leaveRequest.count({
    where: { status: { in: ["PENDING", "MANAGER_APPROVED"] }, employee: { deletedAt: null } },
  })
}

export async function getAttendanceToday() {
  const { start, end } = utcDayRange()

  const [present, totalActive] = await Promise.all([
    prisma.attendance.count({
      where: {
        date: { gte: start, lte: end },
        status: { in: ["PRESENT", "WORK_FROM_HOME", "HALF_DAY", "OUTDOOR_DUTY", "PERMISSION", "WORK_ON_HOLIDAY"] },
        employee: { deletedAt: null },
      },
    }),
    prisma.employee.count({ where: { deletedAt: null, status: "ACTIVE" } }),
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
export async function getBirthdaysThisMonth() {
  const now = new Date()
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, status: "ACTIVE", dob: { not: null } },
    select: { id: true, firstName: true, lastName: true, dob: true, profilePhotoUrl: true },
  })

  return employees
    .filter((e) => e.dob!.getUTCMonth() === now.getUTCMonth())
    .sort((a, b) => a.dob!.getUTCDate() - b.dob!.getUTCDate())
    .map((e) => ({ ...e, day: e.dob!.getUTCDate() }))
}

export async function getWorkAnniversariesThisMonth() {
  const now = new Date()
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
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

export async function getEmployeeGrowth(monthsBack = 6) {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
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

export async function getDepartmentWiseEmployeeCounts() {
  const departments = await prisma.department.findMany({
    select: { name: true, _count: { select: { employees: { where: { deletedAt: null } } } } },
    orderBy: { name: "asc" },
  })

  return departments.map((d) => ({ department: d.name, count: d._count.employees }))
}

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half Day",
  LEAVE: "Leave",
  WORK_FROM_HOME: "Work From Home",
  HOLIDAY: "Holiday",
  WEEK_OFF: "Week Off",
}

export async function getAttendanceStatistics(daysBack = 14) {
  const since = utcDateDaysAgo(daysBack)

  const grouped = await prisma.attendance.groupBy({
    by: ["status"],
    where: { date: { gte: since }, employee: { deletedAt: null } },
    _count: { _all: true },
  })

  return grouped
    .map((g) => ({ status: ATTENDANCE_STATUS_LABELS[g.status] ?? g.status, count: g._count._all }))
    .sort((a, b) => b.count - a.count)
}

export async function getLeaveStatistics() {
  const grouped = await prisma.leaveRequest.groupBy({
    by: ["leaveTypeId"],
    where: { employee: { deletedAt: null } },
    _count: { _all: true },
  })

  const leaveTypes = await prisma.leaveType.findMany({ select: { id: true, name: true } })
  const nameById = new Map(leaveTypes.map((lt) => [lt.id, lt.name]))

  return grouped.map((g) => ({
    leaveType: nameById.get(g.leaveTypeId) ?? "Unknown",
    count: g._count._all,
  }))
}
