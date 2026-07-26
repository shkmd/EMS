import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { acknowledgeReview } from "@/features/performance/mutations"
import { reviewAcknowledgeSchema } from "@/features/performance/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = reviewAcknowledgeSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const review = await acknowledgeReview(id, body, session, meta)
    return apiSuccess({ review }, "Review acknowledged")
  } catch (error) {
    return apiError(error)
  }
}
