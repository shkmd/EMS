import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { ForbiddenError } from "@/lib/errors"
import { canManageEmployees } from "@/features/employees/authorization"
import { listMyAssetAssignments } from "@/features/assets/queries"

// HR-only view of another employee's asset assignments — used by the
// Offboarding checklist to show what still needs to be returned.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    if (!canManageEmployees(session.role)) throw new ForbiddenError()

    const { id } = await params
    const assignments = await listMyAssetAssignments(id)
    return apiSuccess({ assignments })
  } catch (error) {
    return apiError(error)
  }
}
