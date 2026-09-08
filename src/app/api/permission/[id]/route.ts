import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { getPermissionRequestDetail } from "@/features/permission/queries"
import { deletePermissionRequest } from "@/features/permission/mutations"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const request = await getPermissionRequestDetail(id, session)
    return apiSuccess({ request })
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deletePermissionRequest(id, session, meta)
    return apiSuccess(null, "Permission request deleted")
  } catch (error) {
    return apiError(error)
  }
}
