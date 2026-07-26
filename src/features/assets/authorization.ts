import type { Role } from "@prisma/client"

export const ASSET_MANAGE_ROLES: Role[] = ["SUPER_ADMIN", "HR"]

export function canManageAssets(role: Role) {
  return ASSET_MANAGE_ROLES.includes(role)
}
