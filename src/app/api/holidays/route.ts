import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listHolidays } from "@/features/holidays/queries"
import { createHoliday } from "@/features/holidays/mutations"
import { holidayFormSchema, holidayTypeValues } from "@/features/holidays/schemas"

export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear()
    const typeParam = req.nextUrl.searchParams.get("type")
    const type = holidayTypeValues.includes(typeParam as (typeof holidayTypeValues)[number])
      ? (typeParam as (typeof holidayTypeValues)[number])
      : undefined

    const holidays = await listHolidays(year, type)
    return apiSuccess({ holidays })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = holidayFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const holiday = await createHoliday(body, session, meta)
    return apiSuccess({ holiday }, "Holiday created", 201)
  } catch (error) {
    return apiError(error)
  }
}
