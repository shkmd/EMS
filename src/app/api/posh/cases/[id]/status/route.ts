import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { updateCaseStatus } from "@/features/posh/mutations"
import { caseStatusUpdateSchema } from "@/features/posh/schemas"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = caseStatusUpdateSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const poshCase = await updateCaseStatus(id, body, session, meta)
    return apiSuccess({ case: poshCase }, "Status updated")
  } catch (error) {
    return apiError(error)
  }
}
