import "server-only"

import { prisma } from "@/lib/prisma"
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManagePayroll } from "@/features/payroll/authorization"
import type { PayslipFormInput } from "@/features/payroll/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManagePayroll(viewer.role)) throw new ForbiddenError()
}

function computeTotals(input: PayslipFormInput) {
  const basic = Number(input.basic)
  const hra = Number(input.hra)
  const conveyanceAllowance = Number(input.conveyanceAllowance)
  const medicalAllowance = Number(input.medicalAllowance)
  const specialAllowance = Number(input.specialAllowance)
  const otherAllowances = Number(input.otherAllowances)
  const pf = Number(input.pf)
  const esi = Number(input.esi)
  const professionalTax = Number(input.professionalTax)
  const otherDeductions = Number(input.otherDeductions)

  const grossEarnings = basic + hra + conveyanceAllowance + medicalAllowance + specialAllowance + otherAllowances
  const totalDeductions = pf + esi + professionalTax + otherDeductions
  const netSalary = grossEarnings - totalDeductions

  return {
    basic,
    hra,
    conveyanceAllowance,
    medicalAllowance,
    specialAllowance,
    otherAllowances,
    pf,
    esi,
    professionalTax,
    otherDeductions,
    grossEarnings,
    totalDeductions,
    netSalary,
  }
}

export async function generatePayslip(input: PayslipFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const month = Number(input.month)
  const year = Number(input.year)
  const totals = computeTotals(input)

  const existing = await prisma.payslip.findUnique({
    where: { employeeId_month_year: { employeeId: input.employeeId, month, year } },
  })
  if (existing?.status === "PAID") {
    throw new ValidationError("This payslip has already been marked as paid and can no longer be regenerated")
  }

  const payslip = await prisma.payslip.upsert({
    where: { employeeId_month_year: { employeeId: input.employeeId, month, year } },
    update: { ...totals, status: "GENERATED", remarks: input.remarks || null },
    create: {
      employeeId: input.employeeId,
      month,
      year,
      ...totals,
      status: "GENERATED",
      remarks: input.remarks || null,
    },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: existing ? "PAYSLIP_REGENERATED" : "PAYSLIP_GENERATED",
    entityType: "Payslip",
    entityId: payslip.id,
    ...meta,
  })

  return payslip
}

export async function markPayslipPaid(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.payslip.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Payslip not found")
  if (existing.status === "PAID") throw new ValidationError("This payslip is already marked as paid")

  const payslip = await prisma.payslip.update({
    where: { id },
    data: { status: "PAID", paidOnDate: new Date() },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "PAYSLIP_MARKED_PAID",
    entityType: "Payslip",
    entityId: id,
    ...meta,
  })

  return payslip
}

export async function deletePayslip(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.payslip.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Payslip not found")
  if (existing.status === "PAID") throw new ValidationError("Paid payslips cannot be deleted")

  await prisma.payslip.delete({ where: { id } })

  await recordAuditLog({
    userId: viewer.sub,
    action: "PAYSLIP_DELETED",
    entityType: "Payslip",
    entityId: id,
    ...meta,
  })
}
