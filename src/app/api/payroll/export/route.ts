import { NextRequest, NextResponse } from "next/server"

import { apiError } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canManagePayroll } from "@/features/payroll/authorization"
import { listPayslips } from "@/features/payroll/queries"
import { payslipListQuerySchema } from "@/features/payroll/schemas"
import { buildPayrollExcel } from "@/features/payroll/export"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    if (!canManagePayroll(session.role)) throw new ForbiddenError()

    const query = payslipListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const payslips = await listPayslips(query, session)

    const buffer = await buildPayrollExcel(
      payslips.map((p) => ({
        month: p.month,
        year: p.year,
        basic: Number(p.basic),
        grossEarnings: Number(p.grossEarnings),
        totalDeductions: Number(p.totalDeductions),
        netSalary: Number(p.netSalary),
        status: p.status,
        employee: p.employee,
      }))
    )

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="payroll.xlsx"`,
      },
    })
  } catch (error) {
    return apiError(error)
  }
}
