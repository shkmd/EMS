import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canManageSettings } from "@/features/settings/authorization"
import { getWorkingHoursSettingsRow } from "@/features/settings/queries"
import { updateWorkingHoursSettings } from "@/features/settings/mutations"
import { workingHoursSettingsSchema } from "@/features/settings/schemas"

export async function GET() {
  try {
    const session = await requireSession()
    if (!canManageSettings(session.role)) throw new ForbiddenError()

    const settings = await getWorkingHoursSettingsRow()
    return apiSuccess({ settings })
  } catch (error) {
    return apiError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = workingHoursSettingsSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const settings = await updateWorkingHoursSettings(body, session, meta)
    return apiSuccess({ settings }, "Working hours settings updated")
  } catch (error) {
    return apiError(error)
  }
}
