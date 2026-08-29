import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listCasesForAdmin } from "@/features/posh/queries"
import { fileCase } from "@/features/posh/mutations"
import { caseFileSchema } from "@/features/posh/schemas"

export async function GET() {
  try {
    const session = await requireSession()
    const cases = await listCasesForAdmin(session)
    return apiSuccess({ cases })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = caseFileSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const poshCase = await fileCase(body, session, meta)
    return apiSuccess({ case: poshCase }, "Case filed", 201)
  } catch (error) {
    return apiError(error)
  }
}
