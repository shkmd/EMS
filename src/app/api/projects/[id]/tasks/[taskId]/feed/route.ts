import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { getTaskFeed } from "@/features/projects/queries"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    await requireSession()
    const { taskId } = await params

    const feed = await getTaskFeed(taskId)
    return apiSuccess({ feed })
  } catch (error) {
    return apiError(error)
  }
}
