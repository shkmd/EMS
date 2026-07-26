import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { getLeaveRequestDetail } from "@/features/leave/queries"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const request = await getLeaveRequestDetail(id, session)
    return apiSuccess({ request })
  } catch (error) {
    return apiError(error)
  }
}
