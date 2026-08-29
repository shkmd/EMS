import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManagePoshAdmin } from "@/features/posh/authorization"

async function findMyCommitteeMembership(viewer: AccessTokenPayload) {
  if (!viewer.employeeId) return null
  return prisma.poshCommitteeMember.findUnique({ where: { employeeId: viewer.employeeId } })
}

export async function isCommitteeMember(viewer: AccessTokenPayload) {
  return !!(await findMyCommitteeMembership(viewer))
}

async function assertAssignedToCase(caseId: string, viewer: AccessTokenPayload) {
  const membership = await findMyCommitteeMembership(viewer)
  if (!membership) throw new ForbiddenError()

  const assignment = await prisma.poshCaseAssignment.findUnique({
    where: { caseId_committeeMemberId: { caseId, committeeMemberId: membership.id } },
  })
  if (!assignment) throw new ForbiddenError()
  return membership
}

export async function listCommitteeMembers(viewer: AccessTokenPayload) {
  if (!canManagePoshAdmin(viewer.role)) throw new ForbiddenError()
  return prisma.poshCommitteeMember.findMany({
    include: { employee: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } } },
    orderBy: { addedAt: "asc" },
  })
}

/** Admin-facing case list: existence, status, and case number only — never
 * the complainant, respondent, or description. See authorization.ts. */
export async function listCasesForAdmin(viewer: AccessTokenPayload) {
  if (!canManagePoshAdmin(viewer.role)) throw new ForbiddenError()
  return prisma.poshCase.findMany({
    select: {
      id: true,
      caseNumber: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      assignments: { include: { committeeMember: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  })
}

/** Cases assigned to the current viewer as a committee member — full
 * content, since they're authorized to see it. */
export async function listMyAssignedCases(viewer: AccessTokenPayload) {
  const membership = await findMyCommitteeMembership(viewer)
  if (!membership) return []

  return prisma.poshCase.findMany({
    where: { assignments: { some: { committeeMemberId: membership.id } } },
    select: { id: true, caseNumber: true, status: true, respondentName: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
}

/** Full case detail for an assigned committee member: everything, including
 * evidence and internal deliberation notes. */
export async function getCaseForCommittee(id: string, viewer: AccessTokenPayload) {
  await assertAssignedToCase(id, viewer)

  const poshCase = await prisma.poshCase.findUnique({
    where: { id },
    include: {
      complainant: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
      respondentEmployee: { select: { id: true, firstName: true, lastName: true } },
      evidence: { orderBy: { uploadedAt: "asc" } },
      updates: { include: { author: { select: { id: true, email: true } } }, orderBy: { createdAt: "asc" } },
      assignments: { include: { committeeMember: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } } } },
    },
  })
  if (!poshCase) throw new NotFoundError("Case not found")
  return poshCase
}

/** Cases the current employee has filed themselves — status/outcome only,
 * no internal committee deliberation. */
export async function listMyFiledCases(viewer: AccessTokenPayload) {
  if (!viewer.employeeId) return []
  return prisma.poshCase.findMany({
    where: { complainantId: viewer.employeeId },
    select: { id: true, caseNumber: true, status: true, outcome: true, createdAt: true, resolvedAt: true },
    orderBy: { createdAt: "desc" },
  })
}

/** A complainant viewing their own submission: what they wrote plus status
 * and outcome, but not the committee's internal notes. */
export async function getCaseForComplainant(id: string, viewer: AccessTokenPayload) {
  if (!viewer.employeeId) throw new ForbiddenError()

  const poshCase = await prisma.poshCase.findUnique({
    where: { id },
    select: {
      id: true,
      caseNumber: true,
      complainantId: true,
      respondentName: true,
      incidentDate: true,
      description: true,
      status: true,
      outcome: true,
      resolvedAt: true,
      createdAt: true,
      evidence: { select: { id: true, fileName: true, uploadedAt: true } },
    },
  })
  if (!poshCase) throw new NotFoundError("Case not found")
  if (poshCase.complainantId !== viewer.employeeId) throw new ForbiddenError()
  return poshCase
}

/** Combined entry point for the case-detail page: returns the committee view
 * if the viewer is assigned, the complainant view if they filed it, or
 * throws — never both, never neither. */
export async function getCaseDetail(id: string, viewer: AccessTokenPayload) {
  const membership = await findMyCommitteeMembership(viewer)
  if (membership) {
    const assignment = await prisma.poshCaseAssignment.findUnique({
      where: { caseId_committeeMemberId: { caseId: id, committeeMemberId: membership.id } },
    })
    if (assignment) {
      const poshCase = await getCaseForCommittee(id, viewer)
      return { viewAs: "committee" as const, case: poshCase }
    }
  }

  const poshCase = await getCaseForComplainant(id, viewer)
  return { viewAs: "complainant" as const, case: poshCase }
}

export async function getEvidenceFile(evidenceId: string, viewer: AccessTokenPayload) {
  const evidence = await prisma.poshCaseEvidence.findUnique({ where: { id: evidenceId }, include: { case: true } })
  if (!evidence) throw new NotFoundError("Evidence not found")

  if (viewer.employeeId === evidence.case.complainantId) return evidence
  await assertAssignedToCase(evidence.caseId, viewer)
  return evidence
}
