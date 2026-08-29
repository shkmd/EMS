import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { addCaseUpdate } from "@/features/posh/mutations"
import { caseUpdateNoteSchema } from "@/features/posh/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = caseUpdateNoteSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const update = await addCaseUpdate(id, body, session, meta)
    return apiSuccess({ update }, "Note added", 201)
  } catch (error) {
    return apiError(error)
  }
}
