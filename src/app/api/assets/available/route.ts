import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listAvailableAssets } from "@/features/assets/queries"

export async function GET() {
  try {
    await requireSession()
    const assets = await listAvailableAssets()
    return apiSuccess({ assets })
  } catch (error) {
    return apiError(error)
  }
}
