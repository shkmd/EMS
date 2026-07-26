import type { Role } from "@prisma/client"

import type { AccessTokenPayload } from "@/lib/jwt"

export const EMPLOYEE_MANAGE_ROLES: Role[] = ["SUPER_ADMIN", "HR"]
export const EMPLOYEE_VIEW_LIST_ROLES: Role[] = ["SUPER_ADMIN", "HR", "MANAGER"]

export function canManageEmployees(role: Role) {
  return EMPLOYEE_MANAGE_ROLES.includes(role)
}

export function canViewEmployeeList(role: Role) {
  return EMPLOYEE_VIEW_LIST_ROLES.includes(role)
}

/** Whether the signed-in user may view a specific employee's full profile. */
export function canAccessEmployee(
  viewer: AccessTokenPayload,
  employee: { id: string; reportingManagerId: string | null }
) {
  if (canManageEmployees(viewer.role)) return true
  if (viewer.role === "MANAGER" && employee.reportingManagerId === viewer.employeeId) return true
  if (viewer.employeeId === employee.id) return true
  return false
}
