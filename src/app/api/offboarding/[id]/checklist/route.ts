import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { updateOffboardingChecklist } from "@/features/offboarding/mutations"
import { updateOffboardingChecklistSchema } from "@/features/offboarding/schemas"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = updateOffboardingChecklistSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const offboarding = await updateOffboardingChecklist(id, body, session, meta)
    return apiSuccess({ offboarding }, "Checklist updated")
  } catch (error) {
    return apiError(error)
  }
}
