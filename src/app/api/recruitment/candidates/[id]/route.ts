import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { getCandidate } from "@/features/recruitment/queries"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const candidate = await getCandidate(id, session)
    return apiSuccess({ candidate })
  } catch (error) {
    return apiError(error)
  }
}
