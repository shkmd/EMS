import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { endBreak } from "@/features/attendance/mutations"

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const attendance = await endBreak(session, meta)
    return apiSuccess({ attendance }, "Break ended")
  } catch (error) {
    return apiError(error)
  }
}
