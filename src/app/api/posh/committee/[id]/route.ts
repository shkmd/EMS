import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { removeCommitteeMember } from "@/features/posh/mutations"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await removeCommitteeMember(id, session, meta)
    return apiSuccess(null, "Committee member removed")
  } catch (error) {
    return apiError(error)
  }
}
