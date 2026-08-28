import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { updateJobOpeningStatus } from "@/features/recruitment/mutations"
import { jobOpeningStatusUpdateSchema } from "@/features/recruitment/schemas"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = jobOpeningStatusUpdateSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const jobOpening = await updateJobOpeningStatus(id, body, session, meta)
    return apiSuccess({ jobOpening }, "Status updated")
  } catch (error) {
    return apiError(error)
  }
}
