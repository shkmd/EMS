import { apiError, apiSuccess } from "@/lib/api-response"
import { ValidationError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { listMessageableEmployees } from "@/features/messaging/queries"

export async function GET() {
  try {
    const session = await requireSession()
    if (!session.employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")

    const employees = await listMessageableEmployees(session.employeeId)
    return apiSuccess({ employees })
  } catch (error) {
    return apiError(error)
  }
}
