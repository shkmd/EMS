import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { checkIn } from "@/features/attendance/mutations"

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json().catch(() => ({}))
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const attendance = await checkIn(session, !!body?.asWorkFromHome, meta)
    return apiSuccess({ attendance }, "Checked in")
  } catch (error) {
    return apiError(error)
  }
}
