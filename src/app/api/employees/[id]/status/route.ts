import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { updateEmployeeStatus } from "@/features/employees/mutations"
import { employeeStatusSchema } from "@/features/employees/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const { status } = employeeStatusSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const employee = await updateEmployeeStatus(id, status, session, meta)
    return apiSuccess({ employee }, "Employee status updated")
  } catch (error) {
    return apiError(error)
  }
}
