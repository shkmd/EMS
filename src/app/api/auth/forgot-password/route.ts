import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"
import { requestPasswordReset } from "@/features/auth/service"
import { forgotPasswordSchema } from "@/features/auth/schemas"

const GENERIC_MESSAGE = "If an account exists for that email, a password reset link has been sent."

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers)
    const rateLimit = checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000)
    if (!rateLimit.allowed) {
      throw new RateLimitError("Too many requests. Please try again later.")
    }

    const body = forgotPasswordSchema.parse(await req.json())
    const meta = { ipAddress: ip, userAgent: req.headers.get("user-agent") }

    await requestPasswordReset(body.email, meta)

    return apiSuccess(null, GENERIC_MESSAGE)
  } catch (error) {
    return apiError(error)
  }
}
