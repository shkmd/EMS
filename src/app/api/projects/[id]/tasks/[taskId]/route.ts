import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { updateTask, deleteTask } from "@/features/projects/mutations"
import { taskFormSchema } from "@/features/projects/schemas"

type RouteParams = { params: Promise<{ taskId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { taskId } = await params
    const body = taskFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const task = await updateTask(taskId, body, session, meta)
    return apiSuccess({ task }, "Task updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { taskId } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteTask(taskId, session, meta)
    return apiSuccess(null, "Task deleted")
  } catch (error) {
    return apiError(error)
  }
}
