import { NextRequest } from "next/server"

import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { getActiveOnboarding, getOnboardingHistory } from "@/features/onboarding/queries"
import { initiateOnboarding } from "@/features/onboarding/mutations"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const [active, history] = await Promise.all([getActiveOnboarding(id), getOnboardingHistory(id)])
    return apiSuccess({ active, history })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const onboarding = await initiateOnboarding(id, session, meta)
    return apiSuccess({ onboarding }, "Onboarding started", 201)
  } catch (error) {
    return apiError(error)
  }
}
