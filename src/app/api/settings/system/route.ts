import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canManageSettings } from "@/features/settings/authorization"
import { getSystemSettings } from "@/features/settings/queries"
import { updateSystemSettings } from "@/features/settings/mutations"
import { systemSettingsSchema } from "@/features/settings/schemas"

export async function GET() {
  try {
    const session = await requireSession()
    if (!canManageSettings(session.role)) throw new ForbiddenError()

    const settings = await getSystemSettings()
    return apiSuccess({ settings })
  } catch (error) {
    return apiError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = systemSettingsSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const settings = await updateSystemSettings(body, session, meta)
    return apiSuccess({ settings }, "System settings updated")
  } catch (error) {
    return apiError(error)
  }
}
