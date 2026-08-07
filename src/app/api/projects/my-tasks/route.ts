import { apiError, apiSuccess } from "@/lib/api-response"
import { ValidationError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { listMyTasks } from "@/features/projects/queries"

export async function GET() {
  try {
    const session = await requireSession()
    if (!session.employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")

    const tasks = await listMyTasks(session.employeeId)
    return apiSuccess({ tasks })
  } catch (error) {
    return apiError(error)
  }
}
