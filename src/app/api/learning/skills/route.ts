import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listSkillMatrix } from "@/features/learning/queries"
import { upsertSkill } from "@/features/learning/mutations"
import { skillFormSchema } from "@/features/learning/schemas"

export async function GET() {
  try {
    const session = await requireSession()
    const skills = await listSkillMatrix(session)
    return apiSuccess({ skills })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = skillFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const skill = await upsertSkill(body, session, meta)
    return apiSuccess({ skill }, "Skill saved")
  } catch (error) {
    return apiError(error)
  }
}
