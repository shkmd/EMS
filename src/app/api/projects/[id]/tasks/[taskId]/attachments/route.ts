import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { ValidationError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { addTaskAttachment } from "@/features/projects/mutations"

export async function POST(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await requireSession()
    const { taskId } = await params

    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) throw new ValidationError("A file is required")

    const attachment = await addTaskAttachment(taskId, file, session)
    return apiSuccess({ attachment }, "Attachment added", 201)
  } catch (error) {
    return apiError(error)
  }
}
