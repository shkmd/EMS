import { NextRequest } from "next/server"

import { apiError, apiPaginated, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canViewEmployeeList } from "@/features/employees/authorization"
import { listEmployees } from "@/features/employees/queries"
import { createEmployee } from "@/features/employees/mutations"
import { employeeFormSchema, employeeListQuerySchema } from "@/features/employees/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    if (!canViewEmployeeList(session.role)) throw new ForbiddenError()

    const searchParams = Object.fromEntries(req.nextUrl.searchParams)
    const query = employeeListQuerySchema.parse(searchParams)

    const { items, pagination } = await listEmployees(query, session)
    return apiPaginated(items, pagination)
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = employeeFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const { employee, portalAccessGranted } = await createEmployee(body, session, meta)
    return apiSuccess(
      { employee, portalAccessGranted },
      portalAccessGranted ? "Employee created and portal access email sent" : "Employee created",
      201
    )
  } catch (error) {
    return apiError(error)
  }
}
