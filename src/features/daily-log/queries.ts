import "server-only"

import { prisma } from "@/lib/prisma"
import { utcDayRange } from "@/lib/date-only"

export async function getMyDailyLogToday(employeeId: string) {
  const { start, end } = utcDayRange()
  return prisma.dailyLog.findFirst({ where: { employeeId, date: { gte: start, lte: end } } })
}
