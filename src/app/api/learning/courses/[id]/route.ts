import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { getCourseForManage } from "@/features/learning/queries"
import { updateCourse, deleteCourse } from "@/features/learning/mutations"
import { courseFormSchema } from "@/features/learning/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params

    const course = await getCourseForManage(id, session)
    return apiSuccess({ course })
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = courseFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const course = await updateCourse(id, body, session, meta)
    return apiSuccess({ course }, "Course updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteCourse(id, session, meta)
    return apiSuccess(null, "Course deleted")
  } catch (error) {
    return apiError(error)
  }
}
