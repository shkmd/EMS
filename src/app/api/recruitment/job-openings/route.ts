import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listJobOpenings } from "@/features/recruitment/queries"
import { createJobOpening } from "@/features/recruitment/mutations"
import { jobOpeningFormSchema } from "@/features/recruitment/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const includeClosed = req.nextUrl.searchParams.get("includeClosed") === "true"

    const jobOpenings = await listJobOpenings(session, includeClosed)
    return apiSuccess({ jobOpenings })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = jobOpeningFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const jobOpening = await createJobOpening(body, session, meta)
    return apiSuccess({ jobOpening }, "Job opening created", 201)
  } catch (error) {
    return apiError(error)
  }
}
