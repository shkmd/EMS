import type { Role } from "@prisma/client"

export const POLICY_MANAGE_ROLES: Role[] = ["SUPER_ADMIN", "HR"]

export function canManagePolicies(role: Role) {
  return POLICY_MANAGE_ROLES.includes(role)
}
