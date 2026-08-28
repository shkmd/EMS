import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { getJobOpening } from "@/features/recruitment/queries"
import { updateJobOpening, deleteJobOpening } from "@/features/recruitment/mutations"
import { jobOpeningFormSchema } from "@/features/recruitment/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params

    const jobOpening = await getJobOpening(id, session)
    return apiSuccess({ jobOpening })
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = jobOpeningFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const jobOpening = await updateJobOpening(id, body, session, meta)
    return apiSuccess({ jobOpening }, "Job opening updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteJobOpening(id, session, meta)
    return apiSuccess(null, "Job opening deleted")
  } catch (error) {
    return apiError(error)
  }
}
