import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listConversations } from "@/features/messaging/queries"
import { startConversation } from "@/features/messaging/mutations"
import { startConversationSchema } from "@/features/messaging/schemas"

export async function GET() {
  try {
    const session = await requireSession()
    const conversations = await listConversations(session.sub)
    return apiSuccess({ conversations })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = startConversationSchema.parse(await req.json())

    const conversation = await startConversation(body.userId, session)
    return apiSuccess({ conversation }, "Conversation started", 201)
  } catch (error) {
    return apiError(error)
  }
}
