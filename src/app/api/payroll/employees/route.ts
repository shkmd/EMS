import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canManagePayroll } from "@/features/payroll/authorization"
import { listPayrollEmployees } from "@/features/payroll/queries"

export async function GET() {
  try {
    const session = await requireSession()
    if (!canManagePayroll(session.role)) throw new ForbiddenError()

    const employees = await listPayrollEmployees()
    return apiSuccess({ employees })
  } catch (error) {
    return apiError(error)
  }
}
