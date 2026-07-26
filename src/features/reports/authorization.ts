import type { Role } from "@prisma/client"

export const REPORT_VIEW_ROLES: Role[] = ["SUPER_ADMIN", "HR"]

export function canViewReports(role: Role) {
  return REPORT_VIEW_ROLES.includes(role)
}
