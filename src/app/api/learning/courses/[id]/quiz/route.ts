import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { saveQuiz, deleteQuiz } from "@/features/learning/mutations"
import { quizFormSchema } from "@/features/learning/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = quizFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const quiz = await saveQuiz(id, body, session, meta)
    return apiSuccess({ quiz }, "Quiz saved")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteQuiz(id, session, meta)
    return apiSuccess(null, "Quiz deleted")
  } catch (error) {
    return apiError(error)
  }
}
