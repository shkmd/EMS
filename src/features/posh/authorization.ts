import type { Role } from "@prisma/client"

/**
 * POSH admin roles manage committee membership and can see case
 * existence/status/case-number for routing purposes — but NOT case content
 * (complainant, respondent, description, evidence). That content is visible
 * only to the committee members assigned to a given case. This split is a
 * deliberate confidentiality requirement, not an oversight — see the schema
 * comment on PoshCommitteeMember in prisma/schema.prisma.
 */
export const POSH_ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "HR"]

export function canManagePoshAdmin(role: Role) {
  return POSH_ADMIN_ROLES.includes(role)
}
