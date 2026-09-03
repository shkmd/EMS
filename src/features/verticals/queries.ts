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
      officeIpAllowlist: true,
      createdAt: true,
      managers: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { employees: { where: { deletedAt: null } } } },
    },
    orderBy: { name: "asc" },
  })
}

export async function getVerticalById(id: string) {
  const vertical = await prisma.vertical.findUnique({
    where: { id },
    include: { managers: { select: { id: true, firstName: true, lastName: true } } },
  })
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

  return getFallbackWorkingHours()
}

async function getFallbackWorkingHours() {
  const settings = await prisma.workingHoursSettings.findUnique({ where: { id: 1 } })
  return settings ?? { id: 1, updatedAt: new Date(), ...DEFAULT_WORKING_HOURS }
}

/** Same resolution as getWorkingHoursForEmployee, batched for many employees
 * at once (e.g. a team attendance view or report) — one query instead of N. */
export async function getWorkingHoursMap(employeeIds: string[]) {
  const map = new Map<string, { startTime: string; graceMinutes: number }>()
  if (employeeIds.length === 0) return map

  const [employees, fallback] = await Promise.all([
    prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, vertical: { select: { startTime: true, graceMinutes: true } } },
    }),
    getFallbackWorkingHours(),
  ])

  for (const e of employees) {
    map.set(e.id, e.vertical ?? fallback)
  }
  return map
}
