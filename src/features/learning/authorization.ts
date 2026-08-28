import type { Role } from "@prisma/client"

export const LEARNING_MANAGE_ROLES: Role[] = ["SUPER_ADMIN", "HR"]

/** Course catalog management (create/edit/publish courses, build quizzes,
 * assign enrollments) — company-wide, not vertical-scoped like Recruitment,
 * since training content is centrally curated rather than per-team. */
export function canManageLearning(role: Role) {
  return LEARNING_MANAGE_ROLES.includes(role)
}
