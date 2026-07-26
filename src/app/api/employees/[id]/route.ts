import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { getEmployeeDetail } from "@/features/employees/queries"
import { updateEmployee, softDeleteEmployee } from "@/features/employees/mutations"
import { employeeFormSchema } from "@/features/employees/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const employee = await getEmployeeDetail(id, session)
    return apiSuccess({ employee })
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = employeeFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const employee = await updateEmployee(id, body, session, meta)
    return apiSuccess({ employee }, "Employee updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await softDeleteEmployee(id, session, meta)
    return apiSuccess(null, "Employee deleted")
  } catch (error) {
    return apiError(error)
  }
}
