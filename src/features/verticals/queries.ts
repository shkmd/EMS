import "server-only"

import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/errors"

export async function listVerticals() {
  return prisma.vertical.findMany({
    select: {
      id: true,
      name: true,
      startTime: true,
      endTime: true,
      workingDays: true,
      graceMinutes: true,
      halfDayHours: true,
      fullDayHours: true,
      createdAt: true,
      _count: { select: { employees: { where: { deletedAt: null } } } },
    },
    orderBy: { name: "asc" },
  })
}

export async function getVerticalById(id: string) {
  const vertical = await prisma.vertical.findUnique({ where: { id } })
  if (!vertical) throw new NotFoundError("Vertical not found")
  return vertical
}

const DEFAULT_WORKING_HOURS = {
  startTime: "09:00",
  endTime: "18:00",
  workingDays: ["MON", "TUE", "WED", "THU", "FRI"] as unknown,
  graceMinutes: 10,
  halfDayHours: 4,
  fullDayHours: 8,
}

/**
 * Resolves the working-hours config that should govern a given employee:
 * their assigned Vertical if they have one (each vertical carries its own
 * hours, e.g. Amarc 09:30–17:30 vs Athachi Group 09:00–17:00), otherwise
 * the single global WorkingHoursSettings row, otherwise a hardcoded
 * fallback if neither row exists yet.
 */
export async function getWorkingHoursForEmployee(employeeId?: string | null) {
  if (employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { vertical: true },
    })
    if (employee?.vertical) return employee.vertical
  }

  const settings = await prisma.workingHoursSettings.findUnique({ where: { id: 1 } })
  return settings ?? { id: 1, updatedAt: new Date(), ...DEFAULT_WORKING_HOURS }
}
