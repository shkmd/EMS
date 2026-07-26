import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ValidationError } from "@/lib/errors"
import { listGoals } from "@/features/performance/queries"
import { createGoal } from "@/features/performance/mutations"
import { goalFormSchema } from "@/features/performance/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const employeeId = req.nextUrl.searchParams.get("employeeId") ?? session.employeeId
    if (!employeeId) throw new ValidationError("employeeId is required")

    const goals = await listGoals(employeeId, session)
    return apiSuccess({ goals })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = goalFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const goal = await createGoal(body, session, meta)
    return apiSuccess({ goal }, "Goal created", 201)
  } catch (error) {
    return apiError(error)
  }
}
