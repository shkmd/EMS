import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { listAssets } from "@/features/assets/queries"
import { getWorkingHoursMap } from "@/features/verticals/queries"
import { getCompanySettings } from "@/features/settings/queries"
import { getLateMinutes } from "@/features/attendance/lib/late"
import type { LeaveReportQuery, AssetReportQuery, LateSummaryReportQuery } from "@/features/reports/schemas"

export async function getLeaveReportRows(query: LeaveReportQuery) {
  const where: Prisma.LeaveRequestWhereInput = {
    startDate: { lte: new Date(query.dateTo) },
    endDate: { gte: new Date(query.dateFrom) },
  }
  if (query.status) where.status = query.status
  if (query.leaveTypeId) where.leaveTypeId = query.leaveTypeId
  if (query.departmentId) where.employee = { departmentId: query.departmentId }

  return prisma.leaveRequest.findMany({
    where,
    include: {
      leaveType: { select: { name: true } },
      employee: { select: { employeeCode: true, firstName: true, lastName: true, department: { select: { name: true } } } },
    },
    orderBy: { startDate: "desc" },
  })
}

export async function getAssetReportRows(query: AssetReportQuery) {
  return listAssets({ category: query.category, status: query.status })
}

/** Per-employee count of late check-ins within a date range — "late" means
 * checked in after the employee's (vertical or global) working-hours start
 * plus grace period, same threshold as the per-day Attendance Report. */
export async function getLateSummaryReportRows(query: LateSummaryReportQuery) {
  const records = await prisma.attendance.findMany({
    where: {
      date: { gte: new Date(query.dateFrom), lte: new Date(query.dateTo) },
      checkIn: { not: null },
      employee: {
        deletedAt: null,
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      },
    },
    select: {
      date: true,
      checkIn: true,
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true, department: { select: { name: true } } },
      },
    },
    orderBy: [{ employee: { firstName: "asc" } }],
  })

  const [workingHoursMap, companySettings] = await Promise.all([
    getWorkingHoursMap([...new Set(records.map((r) => r.employee.id))]),
    getCompanySettings(),
  ])
  const fallbackHours = { startTime: "09:00", graceMinutes: 10 }

  const byEmployee = new Map<
    string,
    {
      employeeCode: string
      firstName: string
      lastName: string
      department: string | null
      daysPresent: number
      daysLate: number
      totalLateMinutes: number
    }
  >()

  for (const r of records) {
    const hours = workingHoursMap.get(r.employee.id) ?? fallbackHours
    const lateMinutes = getLateMinutes(r.checkIn, r.date, hours, companySettings.timezone)

    const existing = byEmployee.get(r.employee.id) ?? {
      employeeCode: r.employee.employeeCode,
      firstName: r.employee.firstName,
      lastName: r.employee.lastName,
      department: r.employee.department?.name ?? null,
      daysPresent: 0,
      daysLate: 0,
      totalLateMinutes: 0,
    }
    existing.daysPresent += 1
    if (lateMinutes > 0) {
      existing.daysLate += 1
      existing.totalLateMinutes += lateMinutes
    }
    byEmployee.set(r.employee.id, existing)
  }

  return [...byEmployee.values()].sort((a, b) => b.daysLate - a.daysLate)
}
