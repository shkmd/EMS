import { NextRequest } from "next/server"

import { apiError, apiPaginated } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canViewAuditLogs } from "@/features/audit/authorization"
import { listAuditLogs } from "@/features/audit/queries"
import { auditLogQuerySchema } from "@/features/audit/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    if (!canViewAuditLogs(session.role)) throw new ForbiddenError()

    const query = auditLogQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const { items, pagination } = await listAuditLogs(query)
    return apiPaginated(items, pagination)
  } catch (error) {
    return apiError(error)
  }
}
