import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ValidationError } from "@/lib/errors"
import { listReviews } from "@/features/performance/queries"
import { createReview } from "@/features/performance/mutations"
import { reviewFormSchema } from "@/features/performance/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const employeeId = req.nextUrl.searchParams.get("employeeId") ?? session.employeeId
    if (!employeeId) throw new ValidationError("employeeId is required")

    const reviews = await listReviews(employeeId, session)
    return apiSuccess({ reviews })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = reviewFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const review = await createReview(body, session, meta)
    return apiSuccess({ review }, "Review draft created", 201)
  } catch (error) {
    return apiError(error)
  }
}
