import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listAnnouncementsForViewer } from "@/features/announcements/queries"
import { createAnnouncement } from "@/features/announcements/mutations"
import { announcementFormSchema } from "@/features/announcements/schemas"

export async function GET() {
  try {
    const session = await requireSession()
    const announcements = await listAnnouncementsForViewer(session)
    return apiSuccess({ announcements })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = announcementFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const announcement = await createAnnouncement(body, session, meta)
    return apiSuccess({ announcement }, "Announcement posted", 201)
  } catch (error) {
    return apiError(error)
  }
}
