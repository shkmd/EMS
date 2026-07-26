import type { Role } from "@prisma/client"

export function canViewAuditLogs(role: Role) {
  return role === "SUPER_ADMIN"
}
