import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { relayCallSignal } from "@/features/messaging/mutations"
import { callSignalSchema } from "@/features/messaging/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const signal = callSignalSchema.parse(await req.json())
    await relayCallSignal(id, signal, session)

    return apiSuccess(null)
  } catch (error) {
    return apiError(error)
  }
}
