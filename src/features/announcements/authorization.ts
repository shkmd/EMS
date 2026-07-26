import type { Role } from "@prisma/client"

export const ANNOUNCEMENT_MANAGE_ROLES: Role[] = ["SUPER_ADMIN", "HR"]

export function canManageAnnouncements(role: Role) {
  return ANNOUNCEMENT_MANAGE_ROLES.includes(role)
}
