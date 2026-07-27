import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { ValidationError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { sendMessage } from "@/features/messaging/mutations"
import { sendMessageSchema } from "@/features/messaging/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const formData = await req.formData()
    const attachment = formData.get("attachment")
    if (attachment !== null && !(attachment instanceof File)) {
      throw new ValidationError("Invalid attachment")
    }

    const body = sendMessageSchema.parse({ body: formData.get("body") || undefined })
    const message = await sendMessage(id, body, attachment as File | null, session)

    return apiSuccess({ message }, "Message sent", 201)
  } catch (error) {
    return apiError(error)
  }
}
