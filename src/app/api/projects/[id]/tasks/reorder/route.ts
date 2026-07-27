import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { reorderTasks } from "@/features/projects/mutations"
import { reorderTasksSchema } from "@/features/projects/schemas"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = reorderTasksSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await reorderTasks(id, body, session, meta)
    return apiSuccess(null, "Board updated")
  } catch (error) {
    return apiError(error)
  }
}
