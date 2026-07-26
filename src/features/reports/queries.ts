import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { listAssets } from "@/features/assets/queries"
import type { LeaveReportQuery, AssetReportQuery } from "@/features/reports/schemas"

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
