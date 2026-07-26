import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"
import { resetPassword } from "@/features/auth/service"
import { resetPasswordSchema } from "@/features/auth/schemas"

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers)
    const rateLimit = checkRateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000)
    if (!rateLimit.allowed) {
      throw new RateLimitError("Too many requests. Please try again later.")
    }

    const body = resetPasswordSchema.parse(await req.json())
    const meta = { ipAddress: ip, userAgent: req.headers.get("user-agent") }

    await resetPassword(body, meta)

    return apiSuccess(null, "Your password has been reset. You can now log in.")
  } catch (error) {
    return apiError(error)
  }
}
