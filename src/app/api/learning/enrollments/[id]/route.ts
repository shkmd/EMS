import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { getEnrollment } from "@/features/learning/queries"
import { removeEnrollment } from "@/features/learning/mutations"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params

    const enrollment = await getEnrollment(id, session)
    return apiSuccess({ enrollment })
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await removeEnrollment(id, session, meta)
    return apiSuccess(null, "Enrollment removed")
  } catch (error) {
    return apiError(error)
  }
}
