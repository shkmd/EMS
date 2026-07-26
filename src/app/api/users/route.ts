import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canManageUsers } from "@/features/users/authorization"
import { listUsers } from "@/features/users/queries"
import { createUser } from "@/features/users/mutations"
import { createUserSchema } from "@/features/users/schemas"

export async function GET() {
  try {
    const session = await requireSession()
    if (!canManageUsers(session.role)) throw new ForbiddenError()

    const users = await listUsers()
    return apiSuccess({ users })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = createUserSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const user = await createUser(body, session, meta)
    return apiSuccess({ user }, "User created", 201)
  } catch (error) {
    return apiError(error)
  }
}
