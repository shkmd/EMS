import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { updateVertical, deleteVertical } from "@/features/verticals/mutations"
import { verticalFormSchema } from "@/features/verticals/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = verticalFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const vertical = await updateVertical(id, body, session, meta)
    return apiSuccess({ vertical }, "Vertical updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteVertical(id, session, meta)
    return apiSuccess(null, "Vertical deleted")
  } catch (error) {
    return apiError(error)
  }
}
