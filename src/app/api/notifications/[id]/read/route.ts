import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { markNotificationRead } from "@/features/notifications/mutations"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const notification = await markNotificationRead(id, session.sub)
    return apiSuccess({ notification })
  } catch (error) {
    return apiError(error)
  }
}
