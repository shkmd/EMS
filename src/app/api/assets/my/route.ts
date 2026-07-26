import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { ValidationError } from "@/lib/errors"
import { listMyAssetAssignments } from "@/features/assets/queries"

export async function GET() {
  try {
    const session = await requireSession()
    if (!session.employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")

    const assignments = await listMyAssetAssignments(session.employeeId)
    return apiSuccess({ assignments })
  } catch (error) {
    return apiError(error)
  }
}
