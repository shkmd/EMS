import type { Role } from "@prisma/client"

import type { AccessTokenPayload } from "@/lib/jwt"

export const LEAVE_HR_ROLES: Role[] = ["SUPER_ADMIN", "HR"]
export const LEAVE_TEAM_VIEW_ROLES: Role[] = ["SUPER_ADMIN", "HR", "MANAGER"]

export function canActAsHr(role: Role) {
  return LEAVE_HR_ROLES.includes(role)
}

export function canViewTeamLeave(role: Role) {
  return LEAVE_TEAM_VIEW_ROLES.includes(role)
}

/** Whether the viewer may act as the "manager" approver for this request. */
export function canActAsManager(
  viewer: AccessTokenPayload,
  request: { employee: { reportingManagerId: string | null } }
) {
  if (canActAsHr(viewer.role)) return true
  return viewer.role === "MANAGER" && request.employee.reportingManagerId === viewer.employeeId
}

/** Whether the viewer may view this specific leave request. */
export function canViewLeaveRequest(
  viewer: AccessTokenPayload,
  request: { employeeId: string; employee: { reportingManagerId: string | null } }
) {
  if (canActAsHr(viewer.role)) return true
  if (viewer.role === "MANAGER" && request.employee.reportingManagerId === viewer.employeeId) return true
  return viewer.employeeId === request.employeeId
}
