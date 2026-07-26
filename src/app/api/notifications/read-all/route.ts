import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { markAllNotificationsRead } from "@/features/notifications/mutations"

export async function POST() {
  try {
    const session = await requireSession()
    await markAllNotificationsRead(session.sub)
    return apiSuccess(null, "All notifications marked as read")
  } catch (error) {
    return apiError(error)
  }
}
