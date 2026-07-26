import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { getAssetById } from "@/features/assets/queries"
import { updateAsset, deleteAsset } from "@/features/assets/mutations"
import { assetFormSchema } from "@/features/assets/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireSession()
    const { id } = await params
    const asset = await getAssetById(id)
    return apiSuccess({ asset })
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = assetFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const asset = await updateAsset(id, body, session, meta)
    return apiSuccess({ asset }, "Asset updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteAsset(id, session, meta)
    return apiSuccess(null, "Asset deleted")
  } catch (error) {
    return apiError(error)
  }
}
