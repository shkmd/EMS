import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listDesignations } from "@/features/designations/queries"
import { createDesignation } from "@/features/designations/mutations"
import { designationFormSchema } from "@/features/designations/schemas"

export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const search = req.nextUrl.searchParams.get("search") ?? undefined
    const departmentId = req.nextUrl.searchParams.get("departmentId") ?? undefined
    const designations = await listDesignations({ search, departmentId })
    return apiSuccess({ designations })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = designationFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const designation = await createDesignation(body, session, meta)
    return apiSuccess({ designation }, "Designation created", 201)
  } catch (error) {
    return apiError(error)
  }
}
