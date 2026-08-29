import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listPolicies } from "@/features/policies/queries"
import { createPolicy } from "@/features/policies/mutations"
import { policyFormSchema } from "@/features/policies/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const includeUnpublished = req.nextUrl.searchParams.get("includeUnpublished") === "true"

    const policies = await listPolicies(session, includeUnpublished)
    return apiSuccess({ policies })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = policyFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const policy = await createPolicy(body, session, meta)
    return apiSuccess({ policy }, "Policy created", 201)
  } catch (error) {
    return apiError(error)
  }
}
