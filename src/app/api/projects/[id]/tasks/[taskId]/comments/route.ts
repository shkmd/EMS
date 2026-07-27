import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { addTaskComment } from "@/features/projects/mutations"
import { taskCommentSchema } from "@/features/projects/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await requireSession()
    const { taskId } = await params
    const body = taskCommentSchema.parse(await req.json())

    const comment = await addTaskComment(taskId, body, session)
    return apiSuccess({ comment }, "Comment added", 201)
  } catch (error) {
    return apiError(error)
  }
}
