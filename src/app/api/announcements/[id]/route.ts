import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { updateAnnouncement, deleteAnnouncement } from "@/features/announcements/mutations"
import { announcementFormSchema } from "@/features/announcements/schemas"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = announcementFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const announcement = await updateAnnouncement(id, body, session, meta)
    return apiSuccess({ announcement }, "Announcement updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteAnnouncement(id, session, meta)
    return apiSuccess(null, "Announcement deleted")
  } catch (error) {
    return apiError(error)
  }
}
