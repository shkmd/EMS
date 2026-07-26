import "server-only"

import { prisma } from "@/lib/prisma"
import { utcMonthRange } from "@/lib/date-only"
import { ValidationError } from "@/lib/errors"

// Simplified default payroll formulas — a reasonable zero-config starting
// point, not statutory truth. HR reviews and can override every field
// before a payslip is generated; nothing here is enforced at save time.
const HRA_PERCENT = 0.4 // of basic
const PF_PERCENT = 0.12 // of basic (employee contribution)
const ESI_PERCENT = 0.0075 // of gross, only below the wage ceiling
const ESI_WAGE_CEILING = 21000
const PROFESSIONAL_TAX_THRESHOLD = 15000
const PROFESSIONAL_TAX_AMOUNT = 200

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export async function getPayslipDefaults(employeeId: string, month: number, year: number) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId, deletedAt: null },
    select: { basicSalary: true, allowances: true },
  })
  if (!employee) throw new ValidationError("Employee not found")
  if (employee.basicSalary === null) {
    throw new ValidationError("This employee doesn't have a basic salary set on their profile yet")
  }

  const basic = Number(employee.basicSalary)
  const hra = round2(basic * HRA_PERCENT)
  const specialAllowance = Number(employee.allowances ?? 0)
  const conveyanceAllowance = 0
  const medicalAllowance = 0
  const otherAllowances = 0

  const grossEarnings = basic + hra + conveyanceAllowance + medicalAllowance + specialAllowance + otherAllowances

  const pf = round2(basic * PF_PERCENT)
  const esi = grossEarnings <= ESI_WAGE_CEILING ? round2(grossEarnings * ESI_PERCENT) : 0
  const professionalTax = grossEarnings > PROFESSIONAL_TAX_THRESHOLD ? PROFESSIONAL_TAX_AMOUNT : 0

  // Loss-of-Pay integration: approved LOP leave overlapping this month
  // reduces pay, prorated by calendar days in the month.
  const { start, end } = utcMonthRange(year, month)
  const lopRequests = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: "APPROVED",
      startDate: { lte: end },
      endDate: { gte: start },
      leaveType: { code: "LOP" },
    },
    select: { days: true },
  })

  let otherDeductions = 0
  let remarks: string | undefined
  if (lopRequests.length > 0) {
    const lopDays = lopRequests.reduce((sum, r) => sum + Number(r.days), 0)
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const perDayRate = basic / daysInMonth
    otherDeductions = round2(perDayRate * lopDays)
    remarks = `Includes Loss of Pay deduction for ${lopDays} day(s).`
  }

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
    remarks,
  }
}
