import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { ForbiddenError } from "@/lib/errors"
import { canManageEmployees } from "@/features/employees/authorization"
import { listDocumentTemplates } from "@/features/hr-documents/queries"

export async function GET() {
  try {
    const session = await requireSession()
    if (!canManageEmployees(session.role)) throw new ForbiddenError()

    const templates = await listDocumentTemplates()
    return apiSuccess({ templates })
  } catch (error) {
    return apiError(error)
  }
}
