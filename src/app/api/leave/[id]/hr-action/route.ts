import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { hrAction } from "@/features/leave/mutations"
import { leaveActionSchema } from "@/features/leave/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = leaveActionSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const request = await hrAction(id, body, session, meta)
    return apiSuccess({ request }, "Leave request updated")
  } catch (error) {
    return apiError(error)
  }
}
