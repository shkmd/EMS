import "server-only"

import { prisma } from "@/lib/prisma"
import { toUtcDateOnly } from "@/lib/date-only"
import { ValidationError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import type { DailyLogInput } from "@/features/daily-log/schemas"

export async function upsertMyDailyLog(input: DailyLogInput, viewer: AccessTokenPayload) {
  if (!viewer.employeeId) {
    throw new ValidationError("Your account isn't linked to an employee profile yet")
  }
  const date = toUtcDateOnly()

  return prisma.dailyLog.upsert({
    where: { employeeId_date: { employeeId: viewer.employeeId, date } },
    update: { note: input.note },
    create: { employeeId: viewer.employeeId, date, note: input.note },
  })
}
