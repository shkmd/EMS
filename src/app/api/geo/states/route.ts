import { NextRequest } from "next/server"
import { z } from "zod"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listStatesOfCountry } from "@/lib/geo"

const querySchema = z.object({
  country: z.string().min(1, "country is required"),
})

export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    return apiSuccess({ states: listStatesOfCountry(query.country) })
  } catch (error) {
    return apiError(error)
  }
}
