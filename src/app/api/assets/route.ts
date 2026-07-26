import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listAssets } from "@/features/assets/queries"
import { createAsset } from "@/features/assets/mutations"
import { assetFormSchema, assetListQuerySchema } from "@/features/assets/schemas"

export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const query = assetListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const assets = await listAssets(query)
    return apiSuccess({ assets })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = assetFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const asset = await createAsset(body, session, meta)
    return apiSuccess({ asset }, "Asset created", 201)
  } catch (error) {
    return apiError(error)
  }
}
