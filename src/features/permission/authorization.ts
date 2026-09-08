import type { Role } from "@prisma/client"

import type { AccessTokenPayload } from "@/lib/jwt"

export const PERMISSION_HR_ROLES: Role[] = ["SUPER_ADMIN", "HR"]
export const PERMISSION_TEAM_VIEW_ROLES: Role[] = ["SUPER_ADMIN", "HR", "MANAGER"]

export function canActAsHr(role: Role) {
  return PERMISSION_HR_ROLES.includes(role)
}

export function canViewTeamPermission(role: Role) {
  return PERMISSION_TEAM_VIEW_ROLES.includes(role)
}

/** Whether the viewer may act as the "manager" approver for this request.
 * `managedVerticalIds` (verticals the viewer manages) is optional so callers
 * that don't need it can omit the extra lookup. */
export function canActAsManager(
  viewer: AccessTokenPayload,
  request: { employee: { reportingManagerId: string | null; verticalId?: string | null } },
  managedVerticalIds: string[] = []
) {
  if (canActAsHr(viewer.role)) return true
  if (viewer.role !== "MANAGER") return false
  if (request.employee.reportingManagerId === viewer.employeeId) return true
  return !!request.employee.verticalId && managedVerticalIds.includes(request.employee.verticalId)
}

/** Whether the viewer may view this specific permission request. */
export function canViewPermissionRequest(
  viewer: AccessTokenPayload,
  request: { employeeId: string; employee: { reportingManagerId: string | null; verticalId?: string | null } },
  managedVerticalIds: string[] = []
) {
  if (canActAsHr(viewer.role)) return true
  if (viewer.employeeId === request.employeeId) return true
  if (viewer.role !== "MANAGER") return false
  if (request.employee.reportingManagerId === viewer.employeeId) return true
  return !!request.employee.verticalId && managedVerticalIds.includes(request.employee.verticalId)
}
