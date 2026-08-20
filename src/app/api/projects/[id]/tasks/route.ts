import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listProjectTasks } from "@/features/projects/queries"
import { createTask } from "@/features/projects/mutations"
import { taskFormSchema } from "@/features/projects/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params

    const tasks = await listProjectTasks(id, session)
    return apiSuccess({ tasks })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = taskFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const task = await createTask(id, body, session, meta)
    return apiSuccess({ task }, "Task created", 201)
  } catch (error) {
    return apiError(error)
  }
}
