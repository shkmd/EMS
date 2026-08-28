import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listMyEnrollments } from "@/features/learning/queries"

export async function GET() {
  try {
    const session = await requireSession()
    const enrollments = await listMyEnrollments(session)
    return apiSuccess({ enrollments })
  } catch (error) {
    return apiError(error)
  }
}
