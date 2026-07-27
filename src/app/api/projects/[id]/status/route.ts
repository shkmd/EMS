import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { updateProjectStatus } from "@/features/projects/mutations"
import { projectStatusUpdateSchema } from "@/features/projects/schemas"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = projectStatusUpdateSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const project = await updateProjectStatus(id, body, session, meta)
    return apiSuccess({ project }, project.status === "ARCHIVED" ? "Project archived" : "Project restored")
  } catch (error) {
    return apiError(error)
  }
}
