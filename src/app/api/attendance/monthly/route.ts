import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { ValidationError } from "@/lib/errors"
import { getMonthlyAttendance } from "@/features/attendance/queries"
import { monthlyQuerySchema } from "@/features/attendance/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const query = monthlyQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const employeeId = query.employeeId ?? session.employeeId
    if (!employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")

    const data = await getMonthlyAttendance(employeeId, query.year, query.month, session)
    return apiSuccess(data)
  } catch (error) {
    return apiError(error)
  }
}
