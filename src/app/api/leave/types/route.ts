import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listLeaveTypes } from "@/features/leave/queries"

export async function GET() {
  try {
    await requireSession()
    const leaveTypes = await listLeaveTypes()
    return apiSuccess({ leaveTypes })
  } catch (error) {
    return apiError(error)
  }
}
