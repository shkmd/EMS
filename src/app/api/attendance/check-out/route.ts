import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { checkOut } from "@/features/attendance/mutations"

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const attendance = await checkOut(session, meta)
    return apiSuccess({ attendance }, "Checked out")
  } catch (error) {
    return apiError(error)
  }
}
