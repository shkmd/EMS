import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { getHolidayById } from "@/features/holidays/queries"
import { updateHoliday, deleteHoliday } from "@/features/holidays/mutations"
import { holidayFormSchema } from "@/features/holidays/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireSession()
    const { id } = await params
    const holiday = await getHolidayById(id)
    return apiSuccess({ holiday })
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = holidayFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const holiday = await updateHoliday(id, body, session, meta)
    return apiSuccess({ holiday }, "Holiday updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteHoliday(id, session, meta)
    return apiSuccess(null, "Holiday deleted")
  } catch (error) {
    return apiError(error)
  }
}
