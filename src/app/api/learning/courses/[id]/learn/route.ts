import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { getCourseForLearner } from "@/features/learning/queries"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const result = await getCourseForLearner(id, session)
    return apiSuccess(result)
  } catch (error) {
    return apiError(error)
  }
}
