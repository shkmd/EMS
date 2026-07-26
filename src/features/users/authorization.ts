import type { Role } from "@prisma/client"

export function canManageUsers(role: Role) {
  return role === "SUPER_ADMIN"
}
