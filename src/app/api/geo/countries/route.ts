import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listCountries } from "@/lib/geo"

export async function GET() {
  try {
    await requireSession()
    return apiSuccess({ countries: listCountries() })
  } catch (error) {
    return apiError(error)
  }
}
