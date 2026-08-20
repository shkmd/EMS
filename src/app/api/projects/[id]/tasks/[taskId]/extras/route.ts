import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { getTaskExtras } from "@/features/projects/queries"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await requireSession()
    const { taskId } = await params

    const extras = await getTaskExtras(taskId, session)
    return apiSuccess(extras)
  } catch (error) {
    return apiError(error)
  }
}
