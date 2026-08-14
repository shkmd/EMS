import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { ForbiddenError } from "@/lib/errors"
import { canManageSubscriptions } from "@/features/subscriptions/authorization"
import { checkExpiringSubscriptions } from "@/features/subscriptions/reminders"

// Manual trigger for the same check the daily scheduler runs — lets an
// admin verify the notification pipeline (or just not wait for the
// schedule) without needing to fake a date.
export async function POST() {
  try {
    const session = await requireSession()
    if (!canManageSubscriptions(session.role)) throw new ForbiddenError()

    const result = await checkExpiringSubscriptions()
    return apiSuccess(result, "Reminder check complete")
  } catch (error) {
    return apiError(error)
  }
}
