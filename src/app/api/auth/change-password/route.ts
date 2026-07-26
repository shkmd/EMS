import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { REFRESH_TOKEN_COOKIE } from "@/features/auth/constants"
import { changePassword } from "@/features/auth/service"
import { changePasswordSchema } from "@/features/auth/schemas"

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = changePasswordSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }
    const currentRefreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value

    await changePassword(session.sub, body, meta, currentRefreshToken)

    return apiSuccess(null, "Your password has been changed.")
  } catch (error) {
    return apiError(error)
  }
}
