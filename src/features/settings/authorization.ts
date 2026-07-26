import type { Role } from "@prisma/client"

export function canManageSettings(role: Role) {
  return role === "SUPER_ADMIN"
}
