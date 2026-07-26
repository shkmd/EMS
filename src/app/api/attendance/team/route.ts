import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listTeamAttendanceToday } from "@/features/attendance/queries"

export async function GET() {
  try {
    const session = await requireSession()
    const team = await listTeamAttendanceToday(session)
    return apiSuccess({ team })
  } catch (error) {
    return apiError(error)
  }
}
