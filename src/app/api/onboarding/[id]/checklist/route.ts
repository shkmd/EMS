import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { updateOnboardingChecklist } from "@/features/onboarding/mutations"
import { updateOnboardingChecklistSchema } from "@/features/onboarding/schemas"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = updateOnboardingChecklistSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const onboarding = await updateOnboardingChecklist(id, body, session, meta)
    return apiSuccess({ onboarding }, "Checklist updated")
  } catch (error) {
    return apiError(error)
  }
}
