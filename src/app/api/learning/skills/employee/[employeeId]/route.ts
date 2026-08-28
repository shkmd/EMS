import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listSkillsForEmployee } from "@/features/learning/queries"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const session = await requireSession()
    const { employeeId } = await params

    const skills = await listSkillsForEmployee(employeeId, session)
    return apiSuccess({ skills })
  } catch (error) {
    return apiError(error)
  }
}
