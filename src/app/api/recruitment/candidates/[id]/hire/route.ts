import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { hireCandidate } from "@/features/recruitment/mutations"
import { candidateHireSchema } from "@/features/recruitment/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = candidateHireSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await hireCandidate(id, body.employeeId, session, meta)
    return apiSuccess(null, "Candidate hired and onboarding started")
  } catch (error) {
    return apiError(error)
  }
}
