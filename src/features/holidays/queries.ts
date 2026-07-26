import "server-only"

import type { HolidayType, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { utcYearRange } from "@/lib/date-only"
import { NotFoundError } from "@/lib/errors"

export async function listHolidays(year: number, type?: HolidayType) {
  const { start, end } = utcYearRange(year)

  const where: Prisma.HolidayWhereInput = { date: { gte: start, lte: end } }
  if (type) where.type = type

  return prisma.holiday.findMany({ where, orderBy: { date: "asc" } })
}

export async function getHolidayById(id: string) {
  const holiday = await prisma.holiday.findUnique({ where: { id } })
  if (!holiday) throw new NotFoundError("Holiday not found")
  return holiday
}
