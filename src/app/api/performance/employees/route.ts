import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canManagePerformance } from "@/features/performance/authorization"
import { listManageableEmployees } from "@/features/performance/queries"

export async function GET() {
  try {
    const session = await requireSession()
    if (!canManagePerformance(session.role)) throw new ForbiddenError()

    const employees = await listManageableEmployees(session)
    return apiSuccess({ employees })
  } catch (error) {
    return apiError(error)
  }
}
