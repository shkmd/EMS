import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listMessageableUsers } from "@/features/messaging/queries"

export async function GET() {
  try {
    const session = await requireSession()
    const users = await listMessageableUsers(session.sub)
    return apiSuccess({ users })
  } catch (error) {
    return apiError(error)
  }
}
