import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { submitQuiz } from "@/features/learning/mutations"
import { quizSubmitSchema } from "@/features/learning/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = quizSubmitSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const result = await submitQuiz(id, body, session, meta)
    return apiSuccess(result, result.passed ? "You passed!" : "Not quite — you can try again")
  } catch (error) {
    return apiError(error)
  }
}
