import type { Role } from "@prisma/client"

export const PROJECTS_MANAGE_ROLES: Role[] = ["SUPER_ADMIN", "HR", "MANAGER"]

/** Whether the viewer may create/edit projects and create/assign/edit/delete tasks. */
export function canManageProjects(role: Role) {
  return PROJECTS_MANAGE_ROLES.includes(role)
}

/** Whether the viewer is one of the assignees on this task (can update its status). */
export function isTaskAssignee(employeeId: string | null, task: { assignees: { employeeId: string }[] }) {
  if (!employeeId) return false
  return task.assignees.some((a) => a.employeeId === employeeId)
}
