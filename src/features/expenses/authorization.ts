import type { Role } from "@prisma/client"

import type { AccessTokenPayload } from "@/lib/jwt"

export const EXPENSE_HR_ROLES: Role[] = ["SUPER_ADMIN", "HR"]
export const EXPENSE_TEAM_VIEW_ROLES: Role[] = ["SUPER_ADMIN", "HR", "MANAGER"]

export function canActAsHr(role: Role) {
  return EXPENSE_HR_ROLES.includes(role)
}

export function canViewTeamExpenses(role: Role) {
  return EXPENSE_TEAM_VIEW_ROLES.includes(role)
}

/** Whether the viewer may act as the "manager" approver for this claim. */
export function canActAsManager(
  viewer: AccessTokenPayload,
  claim: { employee: { reportingManagerId: string | null } }
) {
  if (canActAsHr(viewer.role)) return true
  return viewer.role === "MANAGER" && claim.employee.reportingManagerId === viewer.employeeId
}

/** Whether the viewer may view this specific expense claim. */
export function canViewExpenseClaim(
  viewer: AccessTokenPayload,
  claim: { employeeId: string; employee: { reportingManagerId: string | null } }
) {
  if (canActAsHr(viewer.role)) return true
  if (viewer.role === "MANAGER" && claim.employee.reportingManagerId === viewer.employeeId) return true
  return viewer.employeeId === claim.employeeId
}
