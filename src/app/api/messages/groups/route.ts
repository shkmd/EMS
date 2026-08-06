import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { createGroupConversation } from "@/features/messaging/mutations"
import { createGroupConversationSchema } from "@/features/messaging/schemas"

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = createGroupConversationSchema.parse(await req.json())

    const conversation = await createGroupConversation(body.name, body.userIds, session)
    return apiSuccess({ conversation }, "Group created", 201)
  } catch (error) {
    return apiError(error)
  }
}
