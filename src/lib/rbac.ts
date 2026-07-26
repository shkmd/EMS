import { Role } from "@prisma/client"

/** Higher number = broader access. Used only for coarse comparisons. */
export const ROLE_RANK: Record<Role, number> = {
  EMPLOYEE: 0,
  MANAGER: 1,
  HR: 2,
  SUPER_ADMIN: 3,
}

export function hasRole(userRole: Role, allowed: Role[]) {
  return allowed.includes(userRole)
}

export function isAtLeast(userRole: Role, minimum: Role) {
  return ROLE_RANK[userRole] >= ROLE_RANK[minimum]
}

export const ALL_ROLES: Role[] = ["SUPER_ADMIN", "HR", "MANAGER", "EMPLOYEE"]
export const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "HR"]
export const MANAGEMENT_ROLES: Role[] = ["SUPER_ADMIN", "HR", "MANAGER"]
