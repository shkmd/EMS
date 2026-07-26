import { NextRequest } from "next/server"

import { getEnv } from "@/config/env"
import { apiError, apiSuccess } from "@/lib/api-response"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"
import { setAuthCookies } from "@/features/auth/cookies"
import { login } from "@/features/auth/service"
import { loginSchema } from "@/features/auth/schemas"

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers)
    const rateLimit = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
    if (!rateLimit.allowed) {
      throw new RateLimitError("Too many login attempts. Please try again later.")
    }

    const body = loginSchema.parse(await req.json())
    const meta = { ipAddress: ip, userAgent: req.headers.get("user-agent") }

    const result = await login(body, meta)

    const res = apiSuccess({ user: result.user })
    const env = getEnv()
    setAuthCookies(
      res,
      { accessToken: result.accessToken, refreshToken: result.refreshToken },
      env.JWT_ACCESS_EXPIRES_IN,
      env.REFRESH_TOKEN_EXPIRES_IN
    )
    return res
  } catch (error) {
    return apiError(error)
  }
}
