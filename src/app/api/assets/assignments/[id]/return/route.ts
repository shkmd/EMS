import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { returnAsset } from "@/features/assets/mutations"
import { returnAssetSchema } from "@/features/assets/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = returnAssetSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const assignment = await returnAsset(id, body, session, meta)
    return apiSuccess({ assignment }, "Asset returned")
  } catch (error) {
    return apiError(error)
  }
}
