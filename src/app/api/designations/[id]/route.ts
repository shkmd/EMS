import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { getDesignationById } from "@/features/designations/queries"
import { updateDesignation, deleteDesignation } from "@/features/designations/mutations"
import { designationFormSchema } from "@/features/designations/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireSession()
    const { id } = await params
    const designation = await getDesignationById(id)
    return apiSuccess({ designation })
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = designationFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const designation = await updateDesignation(id, body, session, meta)
    return apiSuccess({ designation }, "Designation updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteDesignation(id, session, meta)
    return apiSuccess(null, "Designation deleted")
  } catch (error) {
    return apiError(error)
  }
}
