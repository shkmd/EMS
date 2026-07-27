import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canManageProjects } from "@/features/projects/authorization"
import { listProjects } from "@/features/projects/queries"
import { createProject } from "@/features/projects/mutations"
import { projectFormSchema } from "@/features/projects/schemas"

export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const includeArchived = req.nextUrl.searchParams.get("includeArchived") === "true"

    const projects = await listProjects(includeArchived)
    return apiSuccess({ projects })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    if (!canManageProjects(session.role)) throw new ForbiddenError()
    const body = projectFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const project = await createProject(body, session, meta)
    return apiSuccess({ project }, "Project created", 201)
  } catch (error) {
    return apiError(error)
  }
}
