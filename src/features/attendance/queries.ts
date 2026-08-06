import "server-only"

import { utcDayRange, utcMonthRange } from "@/lib/date-only"
import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canAccessEmployeeAttendance, canViewTeamAttendance } from "@/features/attendance/authorization"
import type { AttendanceReportQuery } from "@/features/attendance/schemas"

export async function getTodayAttendance(employeeId: string) {
  const { start, end } = utcDayRange()

  return prisma.attendance.findFirst({
    where: { employeeId, date: { gte: start, lte: end } },
    include: { breaks: { orderBy: { breakStart: "asc" } } },
  })
}

export async function requireEmployeeForAttendance(employeeId: string, viewer: AccessTokenPayload) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, reportingManagerId: true },
  })
  if (!employee) throw new NotFoundError("Employee not found")
  if (!canAccessEmployeeAttendance(viewer, employee)) throw new ForbiddenError()
  return employee
}

export async function getMonthlyAttendance(employeeId: string, year: number, month: number, viewer: AccessTokenPayload) {
  await requireEmployeeForAttendance(employeeId, viewer)

  const { start: monthStart, end: monthEnd } = utcMonthRange(year, month)

  const [records, holidays] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId, date: { gte: monthStart, lte: monthEnd } },
      include: { breaks: true },
      orderBy: { date: "asc" },
    }),
    prisma.holiday.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } }),
  ])

  const summary = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return { records, holidays, summary }
}

export async function listTeamAttendanceToday(viewer: AccessTokenPayload) {
  if (!canViewTeamAttendance(viewer.role)) throw new ForbiddenError()

  const { start, end } = utcDayRange()

  const employeeWhere =
    viewer.role === "MANAGER" ? { deletedAt: null, reportingManagerId: viewer.employeeId } : { deletedAt: null, status: "ACTIVE" as const }

  const employees = await prisma.employee.findMany({
    where: employeeWhere,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profilePhotoUrl: true,
      department: { select: { name: true } },
      attendances: {
        where: { date: { gte: start, lte: end } },
        take: 1,
        include: { breaks: { orderBy: { breakStart: "asc" } } },
      },
      screenActivities: {
        where: { date: { gte: start, lte: end } },
        take: 1,
        select: { activeSeconds: true, idleSeconds: true, lastSeenAt: true },
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  return employees.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    profilePhotoUrl: e.profilePhotoUrl,
    department: e.department?.name ?? null,
    today: e.attendances[0] ?? null,
    screenActivity: e.screenActivities[0] ?? null,
  }))
}

export async function getAttendanceReport(filters: AttendanceReportQuery, viewer: AccessTokenPayload) {
  if (!canViewTeamAttendance(viewer.role) && !filters.employeeId) throw new ForbiddenError()

  const employeeScope =
    viewer.role === "MANAGER"
      ? { reportingManagerId: viewer.employeeId }
      : viewer.role === "EMPLOYEE"
        ? { id: viewer.employeeId ?? "__none__" }
        : {}

  if (filters.employeeId) {
    await requireEmployeeForAttendance(filters.employeeId, viewer)
  }

  return prisma.attendance.findMany({
    where: {
      date: { gte: new Date(filters.dateFrom), lte: new Date(filters.dateTo) },
      employee: {
        deletedAt: null,
        ...employeeScope,
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.employeeId ? { id: filters.employeeId } : {}),
      },
    },
    select: {
      id: true,
      date: true,
      checkIn: true,
      checkOut: true,
      status: true,
      workingMinutes: true,
      breakMinutes: true,
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }, { employee: { firstName: "asc" } }],
  })
}
