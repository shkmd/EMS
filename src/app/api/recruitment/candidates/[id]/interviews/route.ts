import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { createInterview } from "@/features/recruitment/mutations"
import { interviewFormSchema } from "@/features/recruitment/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = interviewFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const interview = await createInterview(id, body, session, meta)
    return apiSuccess({ interview }, "Interview scheduled", 201)
  } catch (error) {
    return apiError(error)
  }
}
