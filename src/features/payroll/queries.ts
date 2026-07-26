import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManagePayroll, canViewPayslip } from "@/features/payroll/authorization"
import type { PayslipListQuery } from "@/features/payroll/schemas"

const payslipInclude = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      department: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.PayslipInclude

export async function listPayslips(query: PayslipListQuery, viewer: AccessTokenPayload) {
  const where: Prisma.PayslipWhereInput = {}

  if (!canManagePayroll(viewer.role)) {
    if (!viewer.employeeId) return []
    where.employeeId = viewer.employeeId
  } else if (query.employeeId) {
    where.employeeId = query.employeeId
  }

  if (query.month) where.month = query.month
  if (query.year) where.year = query.year
  if (query.status) where.status = query.status
  if (query.departmentId) where.employee = { departmentId: query.departmentId }

  return prisma.payslip.findMany({
    where,
    include: payslipInclude,
    orderBy: [{ year: "desc" }, { month: "desc" }, { employee: { firstName: "asc" } }],
  })
}

export async function getPayslipDetail(id: string, viewer: AccessTokenPayload) {
  const payslip = await prisma.payslip.findUnique({ where: { id }, include: payslipInclude })
  if (!payslip) throw new NotFoundError("Payslip not found")
  if (!canViewPayslip(viewer, payslip.employeeId)) throw new ForbiddenError()
  return payslip
}

export async function listPayrollEmployees(departmentId?: string) {
  return prisma.employee.findMany({
    where: { deletedAt: null, status: "ACTIVE", ...(departmentId ? { departmentId } : {}) },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      basicSalary: true,
      department: { select: { id: true, name: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })
}
