import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ValidationError } from "@/lib/errors"
import { listKpis } from "@/features/performance/queries"
import { createKpi } from "@/features/performance/mutations"
import { kpiFormSchema } from "@/features/performance/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const employeeId = req.nextUrl.searchParams.get("employeeId") ?? session.employeeId
    if (!employeeId) throw new ValidationError("employeeId is required")

    const kpis = await listKpis(employeeId, session)
    return apiSuccess({ kpis })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = kpiFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const kpi = await createKpi(body, session, meta)
    return apiSuccess({ kpi }, "KPI created", 201)
  } catch (error) {
    return apiError(error)
  }
}
