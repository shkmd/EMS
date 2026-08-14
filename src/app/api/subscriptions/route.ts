import { NextRequest } from "next/server"

import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { ForbiddenError } from "@/lib/errors"
import { canManageSubscriptions } from "@/features/subscriptions/authorization"
import { listSubscriptions } from "@/features/subscriptions/queries"
import { createSubscription } from "@/features/subscriptions/mutations"
import { subscriptionSchema } from "@/features/subscriptions/schemas"

export async function GET() {
  try {
    const session = await requireSession()
    if (!canManageSubscriptions(session.role)) throw new ForbiddenError()
    const subscriptions = await listSubscriptions()
    return apiSuccess({ subscriptions })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = subscriptionSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const subscription = await createSubscription(body, session, meta)
    return apiSuccess({ subscription }, "Subscription added", 201)
  } catch (error) {
    return apiError(error)
  }
}
