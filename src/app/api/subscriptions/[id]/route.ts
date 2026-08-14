import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { updateSubscription, deleteSubscription } from "@/features/subscriptions/mutations"
import { subscriptionSchema } from "@/features/subscriptions/schemas"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = subscriptionSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const subscription = await updateSubscription(id, body, session, meta)
    return apiSuccess({ subscription }, "Subscription updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteSubscription(id, session, meta)
    return apiSuccess(null, "Subscription deleted")
  } catch (error) {
    return apiError(error)
  }
}
