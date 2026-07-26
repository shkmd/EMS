import { NextRequest } from "next/server"

import { apiError, apiPaginated } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listNotificationsPage } from "@/features/notifications/queries"
import { notificationListQuerySchema } from "@/features/notifications/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const searchParams = Object.fromEntries(req.nextUrl.searchParams)
    const query = notificationListQuerySchema.parse(searchParams)

    const { items, pagination } = await listNotificationsPage(session.sub, query)
    return apiPaginated(items, pagination)
  } catch (error) {
    return apiError(error)
  }
}
