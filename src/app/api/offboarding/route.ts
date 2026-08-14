import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { ForbiddenError } from "@/lib/errors"
import { canManageEmployees } from "@/features/employees/authorization"
import { listInProgressOffboardings } from "@/features/offboarding/queries"

export async function GET() {
  try {
    const session = await requireSession()
    if (!canManageEmployees(session.role)) throw new ForbiddenError()

    const offboardings = await listInProgressOffboardings()
    return apiSuccess({ offboardings })
  } catch (error) {
    return apiError(error)
  }
}
