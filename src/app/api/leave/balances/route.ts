import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError, ValidationError } from "@/lib/errors"
import { canViewTeamLeave } from "@/features/leave/authorization"
import { getLeaveBalances } from "@/features/leave/queries"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const employeeIdParam = req.nextUrl.searchParams.get("employeeId")
    const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear()

    let employeeId = session.employeeId
    if (employeeIdParam && employeeIdParam !== session.employeeId) {
      if (!canViewTeamLeave(session.role)) throw new ForbiddenError()
      employeeId = employeeIdParam
    }
    if (!employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")

    const balances = await getLeaveBalances(employeeId, year)
    return apiSuccess({ balances })
  } catch (error) {
    return apiError(error)
  }
}
