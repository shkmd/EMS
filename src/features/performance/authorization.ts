import type { Role } from "@prisma/client"

import type { AccessTokenPayload } from "@/lib/jwt"

export const PERFORMANCE_MANAGE_ROLES: Role[] = ["SUPER_ADMIN", "HR", "MANAGER"]

export function canManagePerformance(role: Role) {
  return PERFORMANCE_MANAGE_ROLES.includes(role)
}

/** Whether the viewer may create/edit goals, KPIs, or reviews for this employee. */
export function canManageEmployeePerformance(
  viewer: AccessTokenPayload,
  employee: { id: string; reportingManagerId: string | null }
) {
  if (viewer.role === "SUPER_ADMIN" || viewer.role === "HR") return true
  if (viewer.role === "MANAGER" && employee.reportingManagerId === viewer.employeeId) return true
  return false
}

/** Whether the viewer may view this employee's performance data at all. */
export function canViewEmployeePerformance(
  viewer: AccessTokenPayload,
  employee: { id: string; reportingManagerId: string | null }
) {
  if (canManageEmployeePerformance(viewer, employee)) return true
  return viewer.employeeId === employee.id
}
