import type { Role } from "@prisma/client"

export const DEPARTMENT_MANAGE_ROLES: Role[] = ["SUPER_ADMIN", "HR"]

export function canManageDepartments(role: Role) {
  return DEPARTMENT_MANAGE_ROLES.includes(role)
}
