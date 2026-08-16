import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { ForbiddenError } from "@/lib/errors"
import { canManageEmployees } from "@/features/employees/authorization"
import { listInProgressOnboardings } from "@/features/onboarding/queries"

export async function GET() {
  try {
    const session = await requireSession()
    if (!canManageEmployees(session.role)) throw new ForbiddenError()

    const onboardings = await listInProgressOnboardings()
    return apiSuccess({ onboardings })
  } catch (error) {
    return apiError(error)
  }
}
