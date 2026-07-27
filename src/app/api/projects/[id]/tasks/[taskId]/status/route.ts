import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { updateTaskStatus } from "@/features/projects/mutations"
import { taskStatusUpdateSchema } from "@/features/projects/schemas"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await requireSession()
    const { taskId } = await params
    const body = taskStatusUpdateSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const task = await updateTaskStatus(taskId, body, session, meta)
    return apiSuccess({ task }, "Status updated")
  } catch (error) {
    return apiError(error)
  }
}
