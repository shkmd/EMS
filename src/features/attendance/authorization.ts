import type { Role } from "@prisma/client"

import type { AccessTokenPayload } from "@/lib/jwt"

export const ATTENDANCE_MANAGE_ROLES: Role[] = ["SUPER_ADMIN", "HR"]
export const ATTENDANCE_TEAM_VIEW_ROLES: Role[] = ["SUPER_ADMIN", "HR", "MANAGER"]

export function canManageAttendance(role: Role) {
  return ATTENDANCE_MANAGE_ROLES.includes(role)
}

export function canViewTeamAttendance(role: Role) {
  return ATTENDANCE_TEAM_VIEW_ROLES.includes(role)
}

/** Whether the viewer may see a specific employee's attendance records. */
export function canAccessEmployeeAttendance(
  viewer: AccessTokenPayload,
  employee: { id: string; reportingManagerId: string | null }
) {
  if (canManageAttendance(viewer.role)) return true
  if (viewer.role === "MANAGER" && employee.reportingManagerId === viewer.employeeId) return true
  return viewer.employeeId === employee.id
}
