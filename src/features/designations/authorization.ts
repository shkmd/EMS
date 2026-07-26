import type { Role } from "@prisma/client"

export const DESIGNATION_MANAGE_ROLES: Role[] = ["SUPER_ADMIN", "HR"]

export function canManageDesignations(role: Role) {
  return DESIGNATION_MANAGE_ROLES.includes(role)
}
