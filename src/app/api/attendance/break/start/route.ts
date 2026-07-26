import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { startBreak } from "@/features/attendance/mutations"

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const brk = await startBreak(session, meta)
    return apiSuccess({ break: brk }, "Break started")
  } catch (error) {
    return apiError(error)
  }
}
