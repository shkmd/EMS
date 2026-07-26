import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canViewAuditLogs } from "@/features/audit/authorization"
import { listAuditLogFilterOptions } from "@/features/audit/queries"

export async function GET() {
  try {
    const session = await requireSession()
    if (!canViewAuditLogs(session.role)) throw new ForbiddenError()

    const options = await listAuditLogFilterOptions()
    return apiSuccess(options)
  } catch (error) {
    return apiError(error)
  }
}
