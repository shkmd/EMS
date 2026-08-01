import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { addChecklistItem } from "@/features/projects/mutations"
import { checklistItemCreateSchema } from "@/features/projects/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await requireSession()
    const { taskId } = await params
    const body = checklistItemCreateSchema.parse(await req.json())

    const item = await addChecklistItem(taskId, body, session)
    return apiSuccess({ item }, "Checklist item added", 201)
  } catch (error) {
    return apiError(error)
  }
}
