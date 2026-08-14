import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { completeOffboarding } from "@/features/offboarding/mutations"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await completeOffboarding(id, session, meta)
    return apiSuccess(null, "Offboarding completed")
  } catch (error) {
    return apiError(error)
  }
}
