import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { updateCandidateStage } from "@/features/recruitment/mutations"
import { candidateStageUpdateSchema } from "@/features/recruitment/schemas"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = candidateStageUpdateSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const candidate = await updateCandidateStage(id, body, session, meta)
    return apiSuccess({ candidate }, "Stage updated")
  } catch (error) {
    return apiError(error)
  }
}
