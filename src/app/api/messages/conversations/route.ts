import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { ValidationError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { listConversations } from "@/features/messaging/queries"
import { startConversation } from "@/features/messaging/mutations"
import { startConversationSchema } from "@/features/messaging/schemas"

export async function GET() {
  try {
    const session = await requireSession()
    if (!session.employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")

    const conversations = await listConversations(session.employeeId)
    return apiSuccess({ conversations })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = startConversationSchema.parse(await req.json())

    const conversation = await startConversation(body.employeeId, session)
    return apiSuccess({ conversation }, "Conversation started", 201)
  } catch (error) {
    return apiError(error)
  }
}
