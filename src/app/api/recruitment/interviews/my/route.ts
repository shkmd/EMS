import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listMyInterviews } from "@/features/recruitment/queries"

export async function GET() {
  try {
    const session = await requireSession()
    const interviews = await listMyInterviews(session)
    return apiSuccess({ interviews })
  } catch (error) {
    return apiError(error)
  }
}
