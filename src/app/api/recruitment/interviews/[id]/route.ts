import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { getInterview } from "@/features/recruitment/queries"
import { updateInterview, deleteInterview } from "@/features/recruitment/mutations"
import { interviewFormSchema } from "@/features/recruitment/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params

    const interview = await getInterview(id, session)
    return apiSuccess({ interview })
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = interviewFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const interview = await updateInterview(id, body, session, meta)
    return apiSuccess({ interview }, "Interview updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteInterview(id, session, meta)
    return apiSuccess(null, "Interview deleted")
  } catch (error) {
    return apiError(error)
  }
}
