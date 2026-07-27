import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { getTotalUnreadCount } from "@/features/messaging/queries"

export async function GET() {
  try {
    const session = await requireSession()
    const count = session.employeeId ? await getTotalUnreadCount(session.employeeId) : 0
    return apiSuccess({ count })
  } catch (error) {
    return apiError(error)
  }
}
