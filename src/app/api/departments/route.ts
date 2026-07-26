import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listDepartments } from "@/features/departments/queries"
import { createDepartment } from "@/features/departments/mutations"
import { departmentFormSchema } from "@/features/departments/schemas"

export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const search = req.nextUrl.searchParams.get("search") ?? undefined
    const departments = await listDepartments(search)
    return apiSuccess({ departments })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = departmentFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const department = await createDepartment(body, session, meta)
    return apiSuccess({ department }, "Department created", 201)
  } catch (error) {
    return apiError(error)
  }
}
