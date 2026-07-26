import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { assignAsset } from "@/features/assets/mutations"
import { assignAssetSchema } from "@/features/assets/schemas"

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = assignAssetSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const assignment = await assignAsset(body, session, meta)
    return apiSuccess({ assignment }, "Asset assigned", 201)
  } catch (error) {
    return apiError(error)
  }
}
