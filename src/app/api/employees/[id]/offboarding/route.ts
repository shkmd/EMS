import { NextRequest } from "next/server"

import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { getActiveOffboarding, getOffboardingHistory } from "@/features/offboarding/queries"
import { initiateOffboarding } from "@/features/offboarding/mutations"
import { initiateOffboardingSchema } from "@/features/offboarding/schemas"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const [active, history] = await Promise.all([getActiveOffboarding(id), getOffboardingHistory(id)])
    return apiSuccess({ active, history })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = initiateOffboardingSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const offboarding = await initiateOffboarding(id, body, session, meta)
    return apiSuccess({ offboarding }, "Offboarding initiated", 201)
  } catch (error) {
    return apiError(error)
  }
}
