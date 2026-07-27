import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listAssignableEmployees } from "@/features/projects/queries"

export async function GET() {
  try {
    await requireSession()
    const employees = await listAssignableEmployees()
    return apiSuccess({ employees })
  } catch (error) {
    return apiError(error)
  }
}
