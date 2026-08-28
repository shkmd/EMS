import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { startEnrollment } from "@/features/learning/mutations"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const enrollment = await startEnrollment(id, session, meta)
    return apiSuccess({ enrollment }, "Started")
  } catch (error) {
    return apiError(error)
  }
}
