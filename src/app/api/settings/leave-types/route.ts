import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canManageSettings } from "@/features/settings/authorization"
import { listLeaveTypes } from "@/features/leave/queries"
import { createLeaveType } from "@/features/settings/mutations"
import { leaveTypeFormSchema } from "@/features/settings/schemas"

export async function GET() {
  try {
    const session = await requireSession()
    if (!canManageSettings(session.role)) throw new ForbiddenError()

    const leaveTypes = await listLeaveTypes()
    return apiSuccess({ leaveTypes })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = leaveTypeFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const leaveType = await createLeaveType(body, session, meta)
    return apiSuccess({ leaveType }, "Leave type created", 201)
  } catch (error) {
    return apiError(error)
  }
}
