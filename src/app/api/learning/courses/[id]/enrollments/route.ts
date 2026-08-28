import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listEnrollmentsForCourse } from "@/features/learning/queries"
import { assignEnrollments } from "@/features/learning/mutations"
import { enrollmentAssignSchema } from "@/features/learning/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params

    const enrollments = await listEnrollmentsForCourse(id, session)
    return apiSuccess({ enrollments })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = enrollmentAssignSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const enrollments = await assignEnrollments(id, body, session, meta)
    return apiSuccess({ enrollments }, "Employees assigned", 201)
  } catch (error) {
    return apiError(error)
  }
}
