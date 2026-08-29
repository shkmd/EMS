import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listCommitteeMembers } from "@/features/posh/queries"
import { addCommitteeMember } from "@/features/posh/mutations"
import { committeeMemberFormSchema } from "@/features/posh/schemas"

export async function GET() {
  try {
    const session = await requireSession()
    const members = await listCommitteeMembers(session)
    return apiSuccess({ members })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = committeeMemberFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const member = await addCommitteeMember(body, session, meta)
    return apiSuccess({ member }, "Committee member added", 201)
  } catch (error) {
    return apiError(error)
  }
}
