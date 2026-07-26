import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { updateGoal, deleteGoal } from "@/features/performance/mutations"
import { goalFormSchema } from "@/features/performance/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = goalFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const goal = await updateGoal(id, body, session, meta)
    return apiSuccess({ goal }, "Goal updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteGoal(id, session, meta)
    return apiSuccess(null, "Goal deleted")
  } catch (error) {
    return apiError(error)
  }
}
