import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError, ValidationError } from "@/lib/errors"
import { canManagePayroll } from "@/features/payroll/authorization"
import { getPayslipDefaults } from "@/features/payroll/lib/calculate-defaults"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    if (!canManagePayroll(session.role)) throw new ForbiddenError()

    const employeeId = req.nextUrl.searchParams.get("employeeId")
    const month = Number(req.nextUrl.searchParams.get("month"))
    const year = Number(req.nextUrl.searchParams.get("year"))
    if (!employeeId || !month || !year) throw new ValidationError("employeeId, month, and year are required")

    const defaults = await getPayslipDefaults(employeeId, month, year)
    return apiSuccess({ defaults })
  } catch (error) {
    return apiError(error)
  }
}
