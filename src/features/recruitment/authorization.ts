import type { Role } from "@prisma/client"

export const RECRUITMENT_MANAGE_ROLES: Role[] = ["SUPER_ADMIN", "HR", "MANAGER"]

export function canManageRecruitment(role: Role) {
  return RECRUITMENT_MANAGE_ROLES.includes(role)
}

/** Whether the viewer is one of the assigned panelists for this interview — panelists
 * may view the interview and submit their own feedback without full recruitment access. */
export function isInterviewPanelist(employeeId: string | null, interview: { panelists: { employeeId: string }[] }) {
  if (!employeeId) return false
  return interview.panelists.some((p) => p.employeeId === employeeId)
}
