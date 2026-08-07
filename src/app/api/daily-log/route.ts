import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { ValidationError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { getMyDailyLogToday } from "@/features/daily-log/queries"
import { upsertMyDailyLog } from "@/features/daily-log/mutations"
import { dailyLogSchema } from "@/features/daily-log/schemas"

export async function GET() {
  try {
    const session = await requireSession()
    if (!session.employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")

    const log = await getMyDailyLogToday(session.employeeId)
    return apiSuccess({ log })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = dailyLogSchema.parse(await req.json())

    const log = await upsertMyDailyLog(body, session)
    return apiSuccess({ log }, "Saved")
  } catch (error) {
    return apiError(error)
  }
}
