import type { Role } from "@prisma/client"

import type { AccessTokenPayload } from "@/lib/jwt"

export const EMPLOYEE_MANAGE_ROLES: Role[] = ["SUPER_ADMIN", "HR"]
export const EMPLOYEE_VIEW_LIST_ROLES: Role[] = ["SUPER_ADMIN", "HR", "MANAGER"]
// Deliberately broader than EMPLOYEE_MANAGE_ROLES, and only for the create
// pathway: any manager may add employees into their own department (see
// createEmployee), and a vertical manager (canDeleteEmployee below) may also
// add anywhere within their vertical. Edit, status changes, account access,
// notes, and documents on existing employees stay HR/Admin-only (still
// gated by canManageEmployees).
export const EMPLOYEE_CREATE_ROLES: Role[] = ["SUPER_ADMIN", "HR", "MANAGER"]

export function canManageEmployees(role: Role) {
  return EMPLOYEE_MANAGE_ROLES.includes(role)
}

export function canCreateEmployees(role: Role) {
  return EMPLOYEE_CREATE_ROLES.includes(role)
}

export function canViewEmployeeList(role: Role) {
  return EMPLOYEE_VIEW_LIST_ROLES.includes(role)
}

/** Whether the signed-in user may view a specific employee's full profile.
 * `managedVerticalIds` (verticals the viewer manages) is optional so callers
 * that don't need it can omit the extra lookup. */
export function canAccessEmployee(
  viewer: AccessTokenPayload,
  employee: { id: string; reportingManagerId: string | null; verticalId?: string | null },
  managedVerticalIds: string[] = []
) {
  if (canManageEmployees(viewer.role)) return true
  if (viewer.role === "MANAGER" && employee.reportingManagerId === viewer.employeeId) return true
  if (viewer.role === "MANAGER" && employee.verticalId && managedVerticalIds.includes(employee.verticalId)) return true
  if (viewer.employeeId === employee.id) return true
  return false
}

/** Whether the viewer may soft-delete (offboard) this employee: HR/Admin
 * always, or a vertical manager for anyone within a vertical they manage.
 * Deliberately narrower than canAccessEmployee — a plain reporting manager
 * (no managed vertical) can view their direct reports but not delete them. */
export function canDeleteEmployee(
  viewer: AccessTokenPayload,
  employee: { verticalId: string | null },
  managedVerticalIds: string[] = []
) {
  if (canManageEmployees(viewer.role)) return true
  if (viewer.role === "MANAGER" && employee.verticalId && managedVerticalIds.includes(employee.verticalId)) return true
  return false
}
