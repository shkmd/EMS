import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { getDepartmentById } from "@/features/departments/queries"
import { updateDepartment, deleteDepartment } from "@/features/departments/mutations"
import { departmentFormSchema } from "@/features/departments/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireSession()
    const { id } = await params
    const department = await getDepartmentById(id)
    return apiSuccess({ department })
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = departmentFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const department = await updateDepartment(id, body, session, meta)
    return apiSuccess({ department }, "Department updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteDepartment(id, session, meta)
    return apiSuccess(null, "Department deleted")
  } catch (error) {
    return apiError(error)
  }
}
