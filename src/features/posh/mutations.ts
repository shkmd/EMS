import "server-only"

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import { notifyUser } from "@/lib/notify"
import { assertAllowedFile, saveUploadedFile, ALLOWED_DOCUMENT_MIME_TYPES, ALLOWED_PHOTO_MIME_TYPES } from "@/lib/storage"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManagePoshAdmin } from "@/features/posh/authorization"
import type { CommitteeMemberFormInput, CaseFileInput, CaseAssignInput, CaseStatusUpdateInput, CaseUpdateNoteInput } from "@/features/posh/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

const ALLOWED_EVIDENCE_MIME_TYPES = [...ALLOWED_DOCUMENT_MIME_TYPES, ...ALLOWED_PHOTO_MIME_TYPES]

function assertCanManageAdmin(viewer: AccessTokenPayload) {
  if (!canManagePoshAdmin(viewer.role)) throw new ForbiddenError()
}

async function requireCommitteeMembership(viewer: AccessTokenPayload) {
  if (!viewer.employeeId) throw new ForbiddenError()
  const membership = await prisma.poshCommitteeMember.findUnique({ where: { employeeId: viewer.employeeId } })
  if (!membership) throw new ForbiddenError()
  return membership
}

async function requireAssignedMembership(caseId: string, viewer: AccessTokenPayload) {
  const membership = await requireCommitteeMembership(viewer)
  const assignment = await prisma.poshCaseAssignment.findUnique({
    where: { caseId_committeeMemberId: { caseId, committeeMemberId: membership.id } },
  })
  if (!assignment) throw new ForbiddenError()
  return membership
}

// ---------- Committee membership ----------

export async function addCommitteeMember(input: CommitteeMemberFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManageAdmin(viewer)

  const employee = await prisma.employee.findUnique({ where: { id: input.employeeId }, select: { id: true } })
  if (!employee) throw new NotFoundError("Employee not found")

  const existing = await prisma.poshCommitteeMember.findUnique({ where: { employeeId: input.employeeId } })
  if (existing) throw new ValidationError("This employee is already on the committee")

  const member = await prisma.poshCommitteeMember.create({
    data: { employeeId: input.employeeId, isPresidingOfficer: input.isPresidingOfficer },
  })

  await recordAuditLog({ userId: viewer.sub, action: "POSH_COMMITTEE_MEMBER_ADDED", entityType: "PoshCommitteeMember", entityId: member.id, ...meta })
  return member
}

export async function removeCommitteeMember(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManageAdmin(viewer)

  const member = await prisma.poshCommitteeMember.findUnique({ where: { id } })
  if (!member) throw new NotFoundError("Committee member not found")

  await prisma.poshCommitteeMember.delete({ where: { id } })
  await recordAuditLog({ userId: viewer.sub, action: "POSH_COMMITTEE_MEMBER_REMOVED", entityType: "PoshCommitteeMember", entityId: id, ...meta })
}

// ---------- Filing a case ----------

async function generateCaseNumber(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear()
  const count = await tx.poshCase.count({ where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } })
  return `POSH-${year}-${String(count + 1).padStart(4, "0")}`
}

export async function fileCase(input: CaseFileInput, viewer: AccessTokenPayload, meta: Meta) {
  if (!viewer.employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")

  const poshCase = await prisma.$transaction(async (tx) => {
    const caseNumber = await generateCaseNumber(tx)
    return tx.poshCase.create({
      data: {
        caseNumber,
        complainantId: viewer.employeeId!,
        respondentName: input.respondentName,
        respondentEmployeeId: input.respondentEmployeeId || null,
        incidentDate: input.incidentDate ? new Date(input.incidentDate) : null,
        description: input.description,
      },
    })
  })

  // Audit log intentionally omits complaint content — see authorization.ts.
  await recordAuditLog({ userId: viewer.sub, action: "POSH_CASE_FILED", entityType: "PoshCase", entityId: poshCase.id, ...meta })

  const committeeMembers = await prisma.poshCommitteeMember.findMany({ include: { employee: { select: { userId: true } } } })
  await Promise.all(
    committeeMembers
      .filter((m) => m.employee.userId)
      .map((m) =>
        notifyUser(m.employee.userId!, m.employeeId, "New POSH case submitted", `Case ${poshCase.caseNumber} needs committee assignment`, "/posh")
      )
  )

  return poshCase
}

export async function uploadEvidence(caseId: string, file: File, viewer: AccessTokenPayload) {
  const poshCase = await prisma.poshCase.findUnique({ where: { id: caseId } })
  if (!poshCase) throw new NotFoundError("Case not found")

  const isComplainant = viewer.employeeId === poshCase.complainantId
  if (!isComplainant) await requireAssignedMembership(caseId, viewer)

  assertAllowedFile(file, ALLOWED_EVIDENCE_MIME_TYPES)
  const buffer = Buffer.from(await file.arrayBuffer())
  const { relativePath } = await saveUploadedFile(buffer, `posh-cases/${caseId}`, file.name)

  const evidence = await prisma.poshCaseEvidence.create({
    data: { caseId, fileUrl: relativePath, fileName: file.name, uploadedById: viewer.sub },
  })

  await recordAuditLog({ userId: viewer.sub, action: "POSH_CASE_EVIDENCE_UPLOADED", entityType: "PoshCase", entityId: caseId })
  return evidence
}

// ---------- Committee case management ----------

export async function assignCommitteeMembers(caseId: string, input: CaseAssignInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManageAdmin(viewer)

  const poshCase = await prisma.poshCase.findUnique({ where: { id: caseId } })
  if (!poshCase) throw new NotFoundError("Case not found")

  const members = await prisma.poshCommitteeMember.findMany({
    where: { id: { in: input.committeeMemberIds } },
    include: { employee: { select: { userId: true } } },
  })
  if (members.length !== input.committeeMemberIds.length) throw new ValidationError("One or more committee members are invalid")

  const existing = await prisma.poshCaseAssignment.findMany({
    where: { caseId, committeeMemberId: { in: input.committeeMemberIds } },
    select: { committeeMemberId: true },
  })
  const alreadyAssigned = new Set(existing.map((e) => e.committeeMemberId))
  const toAssign = members.filter((m) => !alreadyAssigned.has(m.id))

  if (toAssign.length === 0) return []

  await prisma.poshCaseAssignment.createMany({ data: toAssign.map((m) => ({ caseId, committeeMemberId: m.id })) })

  if (poshCase.status === "SUBMITTED") {
    await prisma.poshCase.update({ where: { id: caseId }, data: { status: "UNDER_REVIEW" } })
  }

  await recordAuditLog({
    userId: viewer.sub,
    action: "POSH_CASE_ASSIGNED",
    entityType: "PoshCase",
    entityId: caseId,
    metadata: { committeeMemberIds: toAssign.map((m) => m.id) },
    ...meta,
  })

  await Promise.all(
    toAssign
      .filter((m) => m.employee.userId)
      .map((m) => notifyUser(m.employee.userId!, m.employeeId, "POSH case assigned", `You've been assigned to case ${poshCase.caseNumber}`, "/posh"))
  )

  return toAssign
}

export async function addCaseUpdate(caseId: string, input: CaseUpdateNoteInput, viewer: AccessTokenPayload, meta: Meta) {
  await requireAssignedMembership(caseId, viewer)

  const update = await prisma.poshCaseUpdate.create({ data: { caseId, authorId: viewer.sub, note: input.note } })
  await recordAuditLog({ userId: viewer.sub, action: "POSH_CASE_UPDATE_ADDED", entityType: "PoshCase", entityId: caseId, ...meta })
  return update
}

export async function updateCaseStatus(caseId: string, input: CaseStatusUpdateInput, viewer: AccessTokenPayload, meta: Meta) {
  await requireAssignedMembership(caseId, viewer)

  const poshCase = await prisma.poshCase.findUnique({ where: { id: caseId }, include: { complainant: { select: { userId: true } } } })
  if (!poshCase) throw new NotFoundError("Case not found")

  const isFinal = input.status === "RESOLVED" || input.status === "DISMISSED"
  const updated = await prisma.poshCase.update({
    where: { id: caseId },
    data: {
      status: input.status,
      outcome: input.outcome || null,
      resolvedAt: isFinal ? new Date() : null,
    },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "POSH_CASE_STATUS_UPDATED",
    entityType: "PoshCase",
    entityId: caseId,
    metadata: { status: input.status },
    ...meta,
  })

  if (isFinal && poshCase.complainant.userId) {
    await notifyUser(poshCase.complainant.userId, poshCase.complainantId, "Your reported case has been updated", `Case ${poshCase.caseNumber} has reached a final decision`, "/posh")
  }

  return updated
}
