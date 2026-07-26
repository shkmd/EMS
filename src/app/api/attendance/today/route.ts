import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { getTodayAttendance } from "@/features/attendance/queries"
import { ValidationError } from "@/lib/errors"

export async function GET() {
  try {
    const session = await requireSession()
    if (!session.employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")

    const attendance = await getTodayAttendance(session.employeeId)
    return apiSuccess({ attendance })
  } catch (error) {
    return apiError(error)
  }
}
