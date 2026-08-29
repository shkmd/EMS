import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { getPolicy } from "@/features/policies/queries"
import { updatePolicy, deletePolicy } from "@/features/policies/mutations"
import { policyFormSchema } from "@/features/policies/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params

    const result = await getPolicy(id, session)
    return apiSuccess(result)
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = policyFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const policy = await updatePolicy(id, body, session, meta)
    return apiSuccess({ policy }, "Policy updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deletePolicy(id, session, meta)
    return apiSuccess(null, "Policy deleted")
  } catch (error) {
    return apiError(error)
  }
}
