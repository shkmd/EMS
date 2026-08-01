import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { createSubtask } from "@/features/projects/mutations"
import { createSubtaskSchema } from "@/features/projects/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await requireSession()
    const { taskId } = await params
    const body = createSubtaskSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const subtask = await createSubtask(taskId, body, session, meta)
    return apiSuccess({ subtask }, "Subtask created", 201)
  } catch (error) {
    return apiError(error)
  }
}
