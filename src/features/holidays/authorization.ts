import type { Role } from "@prisma/client"

export const HOLIDAY_MANAGE_ROLES: Role[] = ["SUPER_ADMIN", "HR"]

export function canManageHolidays(role: Role) {
  return HOLIDAY_MANAGE_ROLES.includes(role)
}
