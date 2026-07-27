import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { markConversationRead } from "@/features/messaging/mutations"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    await markConversationRead(id, session)
    return apiSuccess(null, "Marked as read")
  } catch (error) {
    return apiError(error)
  }
}
