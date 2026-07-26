import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { updateLeaveType, deleteLeaveType } from "@/features/settings/mutations"
import { leaveTypeFormSchema } from "@/features/settings/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = leaveTypeFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const leaveType = await updateLeaveType(id, body, session, meta)
    return apiSuccess({ leaveType }, "Leave type updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteLeaveType(id, session, meta)
    return apiSuccess(null, "Leave type deleted")
  } catch (error) {
    return apiError(error)
  }
}
