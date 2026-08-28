import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listCandidates } from "@/features/recruitment/queries"
import { createCandidate } from "@/features/recruitment/mutations"
import { candidateCreateSchema } from "@/features/recruitment/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params

    const candidates = await listCandidates(id, session)
    return apiSuccess({ candidates })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = candidateCreateSchema.parse({ ...(await req.json()), jobOpeningId: id })
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const candidate = await createCandidate(body, session, meta)
    return apiSuccess({ candidate }, "Candidate added", 201)
  } catch (error) {
    return apiError(error)
  }
}
