import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listVerticals } from "@/features/verticals/queries"
import { createVertical } from "@/features/verticals/mutations"
import { verticalFormSchema } from "@/features/verticals/schemas"

export async function GET() {
  try {
    await requireSession()
    const verticals = await listVerticals()
    return apiSuccess({ verticals })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = verticalFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const vertical = await createVertical(body, session, meta)
    return apiSuccess({ vertical }, "Vertical created", 201)
  } catch (error) {
    return apiError(error)
  }
}
