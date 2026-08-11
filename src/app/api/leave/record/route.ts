import { NextRequest } from "next/server"

import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { createLeaveRequestForEmployee } from "@/features/leave/mutations"
import { leaveRequestCreateForEmployeeSchema } from "@/features/leave/schemas"

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = leaveRequestCreateForEmployeeSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const request = await createLeaveRequestForEmployee(body, session, meta)
    return apiSuccess({ request }, "Leave request recorded", 201)
  } catch (error) {
    return apiError(error)
  }
}
