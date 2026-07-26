import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { updateEmployeeAccountAccess } from "@/features/employees/mutations"
import { accountAccessSchema } from "@/features/employees/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = accountAccessSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const result = await updateEmployeeAccountAccess(id, body, session, meta)
    return apiSuccess(result, result.hasAccess ? "Portal access updated" : "Portal access revoked")
  } catch (error) {
    return apiError(error)
  }
}
