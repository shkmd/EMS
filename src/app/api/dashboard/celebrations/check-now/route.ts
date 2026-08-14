import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { ForbiddenError } from "@/lib/errors"
import { notifyTodaysCelebrations } from "@/features/dashboard/celebrations-notify"

// Manual trigger for the same check the daily scheduler runs — lets an
// admin verify the celebrations notification pipeline without waiting for
// the schedule (or someone's actual birthday).
export async function POST() {
  try {
    const session = await requireSession()
    if (session.role !== "SUPER_ADMIN") throw new ForbiddenError()

    const result = await notifyTodaysCelebrations()
    return apiSuccess(result, "Celebrations check complete")
  } catch (error) {
    return apiError(error)
  }
}
