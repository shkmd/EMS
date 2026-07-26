import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { clearAuthCookies } from "@/features/auth/cookies"
import { REFRESH_TOKEN_COOKIE } from "@/features/auth/constants"
import { logout } from "@/features/auth/service"

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await logout(refreshToken, meta)

    const res = apiSuccess(null)
    clearAuthCookies(res)
    return res
  } catch (error) {
    return apiError(error)
  }
}
