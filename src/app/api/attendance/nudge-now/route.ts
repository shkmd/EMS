import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { ForbiddenError } from "@/lib/errors"
import { nudgeMissingCheckIns } from "@/features/attendance/nudge"

// Manual trigger for the same sweep the scheduler runs every 30 minutes —
// lets an admin verify the nudge pipeline without waiting for a real
// shift-start window.
export async function POST() {
  try {
    const session = await requireSession()
    if (session.role !== "SUPER_ADMIN") throw new ForbiddenError()

    const result = await nudgeMissingCheckIns()
    return apiSuccess(result, "Nudge sweep complete")
  } catch (error) {
    return apiError(error)
  }
}
