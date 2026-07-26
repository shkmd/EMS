import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listRecentNotifications } from "@/features/notifications/queries"

export async function GET() {
  try {
    const session = await requireSession()
    const data = await listRecentNotifications(session.sub)
    return apiSuccess(data)
  } catch (error) {
    return apiError(error)
  }
}
