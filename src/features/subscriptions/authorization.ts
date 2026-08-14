import type { Role } from "@prisma/client"

const SUBSCRIPTION_MANAGER_ROLES: Role[] = ["SUPER_ADMIN", "HR"]

export function canManageSubscriptions(role: Role) {
  return SUBSCRIPTION_MANAGER_ROLES.includes(role)
}
