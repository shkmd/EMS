import { NextRequest } from "next/server"

import { getEnv } from "@/config/env"
import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { setAuthCookies, clearAuthCookies } from "@/features/auth/cookies"
import { REFRESH_TOKEN_COOKIE } from "@/features/auth/constants"
import { refreshSession } from "@/features/auth/service"

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const result = await refreshSession(refreshToken, meta)

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
    const res = apiError(error)
    clearAuthCookies(res)
    return res
  }
}
