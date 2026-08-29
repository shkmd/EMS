import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listMyAssignedCases } from "@/features/posh/queries"

export async function GET() {
  try {
    const session = await requireSession()
    const cases = await listMyAssignedCases(session)
    return apiSuccess({ cases })
  } catch (error) {
    return apiError(error)
  }
}
