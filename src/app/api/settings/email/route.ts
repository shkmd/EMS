import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canManageSettings } from "@/features/settings/authorization"
import { getEmailSettingsForDisplay } from "@/features/settings/queries"
import { updateEmailSettings } from "@/features/settings/mutations"
import { emailSettingsSchema } from "@/features/settings/schemas"

export async function GET() {
  try {
    const session = await requireSession()
    if (!canManageSettings(session.role)) throw new ForbiddenError()

    const settings = await getEmailSettingsForDisplay()
    return apiSuccess({ settings })
  } catch (error) {
    return apiError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = emailSettingsSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const settings = await updateEmailSettings(body, session, meta)
    return apiSuccess({ settings }, "Email settings updated")
  } catch (error) {
    return apiError(error)
  }
}
