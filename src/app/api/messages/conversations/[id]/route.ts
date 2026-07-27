import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { ValidationError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { getConversationForViewer, listMessages } from "@/features/messaging/queries"
import { messagesListQuerySchema } from "@/features/messaging/schemas"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    if (!session.employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")
    const { id } = await params

    const query = messagesListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const [conversation, page] = await Promise.all([
      getConversationForViewer(id, session.employeeId),
      listMessages(id, session.employeeId, query),
    ])

    return apiSuccess({ conversation, ...page })
  } catch (error) {
    return apiError(error)
  }
}
