import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canManageUsers } from "@/features/users/authorization"
import { listUnlinkedEmployees } from "@/features/users/queries"

export async function GET() {
  try {
    const session = await requireSession()
    if (!canManageUsers(session.role)) throw new ForbiddenError()

    const employees = await listUnlinkedEmployees()
    return apiSuccess({ employees })
  } catch (error) {
    return apiError(error)
  }
}
