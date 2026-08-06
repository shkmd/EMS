import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { recordHeartbeat } from "@/features/activity/mutations"
import { heartbeatSchema } from "@/features/activity/schemas"

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = heartbeatSchema.parse(await req.json())

    await recordHeartbeat(session, body)
    return apiSuccess(null)
  } catch (error) {
    return apiError(error)
  }
}
