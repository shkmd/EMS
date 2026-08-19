import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { getLeaveRequestDetail } from "@/features/leave/queries"
import { updateLeaveRequest, deleteLeaveRequest } from "@/features/leave/mutations"
import { leaveRequestUpdateSchema } from "@/features/leave/schemas"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const request = await getLeaveRequestDetail(id, session)
    return apiSuccess({ request })
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = leaveRequestUpdateSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const request = await updateLeaveRequest(id, body, session, meta)
    return apiSuccess({ request }, "Leave request updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteLeaveRequest(id, session, meta)
    return apiSuccess(null, "Leave request deleted")
  } catch (error) {
    return apiError(error)
  }
}
