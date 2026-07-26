import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { togglePinAnnouncement } from "@/features/announcements/mutations"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const announcement = await togglePinAnnouncement(id, session, meta)
    return apiSuccess({ announcement }, announcement.isPinned ? "Announcement pinned" : "Announcement unpinned")
  } catch (error) {
    return apiError(error)
  }
}
