import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { reassignAsset } from "@/features/assets/mutations"
import { reassignAssetSchema } from "@/features/assets/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = reassignAssetSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const assignment = await reassignAsset(id, body, session, meta)
    return apiSuccess({ assignment }, "Asset reassigned")
  } catch (error) {
    return apiError(error)
  }
}
