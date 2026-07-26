import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listLeaveRequests } from "@/features/leave/queries"
import { applyLeave } from "@/features/leave/mutations"
import { applyLeaveSchema, leaveListQuerySchema } from "@/features/leave/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const query = leaveListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const requests = await listLeaveRequests(query, session)
    return apiSuccess({ requests })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = applyLeaveSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const request = await applyLeave(body, session, meta)
    return apiSuccess({ request }, "Leave request submitted", 201)
  } catch (error) {
    return apiError(error)
  }
}
