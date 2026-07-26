import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { getExpenseClaimDetail } from "@/features/expenses/queries"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const claim = await getExpenseClaimDetail(id, session)
    return apiSuccess({ claim })
  } catch (error) {
    return apiError(error)
  }
}
