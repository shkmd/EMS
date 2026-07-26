import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { getLeaveCalendar } from "@/features/leave/queries"
import { leaveCalendarQuerySchema } from "@/features/leave/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const query = leaveCalendarQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const entries = await getLeaveCalendar(query.year, query.month, session)
    return apiSuccess({ entries })
  } catch (error) {
    return apiError(error)
  }
}
