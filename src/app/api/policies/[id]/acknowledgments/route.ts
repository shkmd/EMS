import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listAcknowledgmentsForPolicy } from "@/features/policies/queries"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const acknowledgments = await listAcknowledgmentsForPolicy(id, session)
    return apiSuccess({ acknowledgments })
  } catch (error) {
    return apiError(error)
  }
}
