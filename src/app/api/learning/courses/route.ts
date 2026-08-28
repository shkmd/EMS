import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listCourses } from "@/features/learning/queries"
import { createCourse } from "@/features/learning/mutations"
import { courseFormSchema } from "@/features/learning/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const includeUnpublished = req.nextUrl.searchParams.get("includeUnpublished") === "true"

    const courses = await listCourses(session, includeUnpublished)
    return apiSuccess({ courses })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = courseFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const course = await createCourse(body, session, meta)
    return apiSuccess({ course }, "Course created", 201)
  } catch (error) {
    return apiError(error)
  }
}
