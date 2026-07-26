import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { upsertManualAttendance } from "@/features/attendance/mutations"
import { manualAttendanceSchema } from "@/features/attendance/schemas"

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = manualAttendanceSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const attendance = await upsertManualAttendance(body, session, meta)
    return apiSuccess({ attendance }, "Attendance saved", 201)
  } catch (error) {
    return apiError(error)
  }
}
