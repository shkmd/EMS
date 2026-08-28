import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import { notifyUser } from "@/lib/notify"
import { assertAllowedFile, deleteUploadedFile, saveUploadedFile, ALLOWED_DOCUMENT_MIME_TYPES } from "@/lib/storage"
import type { AccessTokenPayload } from "@/lib/jwt"
import { assertVerticalVisible } from "@/features/verticals/scope"
import { canManageRecruitment, isInterviewPanelist } from "@/features/recruitment/authorization"
import { initiateOnboarding } from "@/features/onboarding/mutations"
import type {
  JobOpeningFormInput,
  JobOpeningStatusUpdateInput,
  CandidateCreateInput,
  CandidateStageUpdateInput,
  InterviewFormInput,
  InterviewStatusUpdateInput,
  InterviewFeedbackInput,
} from "@/features/recruitment/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageRecruitment(viewer.role)) throw new ForbiddenError()
}

async function assertCanManageJobOpening(viewer: AccessTokenPayload, verticalId: string | null) {
  assertCanManage(viewer)
  await assertVerticalVisible(viewer, verticalId)
}

// ---------- Job Openings ----------

export async function createJobOpening(input: JobOpeningFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const creator = viewer.employeeId
    ? await prisma.employee.findUnique({ where: { id: viewer.employeeId }, select: { verticalId: true } })
    : null
  const verticalId = input.verticalId || creator?.verticalId || null
  await assertVerticalVisible(viewer, verticalId)

  const jobOpening = await prisma.jobOpening.create({
    data: {
      title: input.title,
      departmentId: input.departmentId || null,
      designationId: input.designationId || null,
      verticalId,
      employmentType: input.employmentType,
      numberOfPositions: Number(input.numberOfPositions),
      description: input.description || null,
      requirements: input.requirements || null,
      createdById: viewer.sub,
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "JOB_OPENING_CREATED", entityType: "JobOpening", entityId: jobOpening.id, ...meta })
  return jobOpening
}

export async function updateJobOpening(id: string, input: JobOpeningFormInput, viewer: AccessTokenPayload, meta: Meta) {
  const existing = await prisma.jobOpening.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Job opening not found")
  await assertCanManageJobOpening(viewer, existing.verticalId)

  const jobOpening = await prisma.jobOpening.update({
    where: { id },
    data: {
      title: input.title,
      departmentId: input.departmentId || null,
      designationId: input.designationId || null,
      employmentType: input.employmentType,
      numberOfPositions: Number(input.numberOfPositions),
      description: input.description || null,
      requirements: input.requirements || null,
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "JOB_OPENING_UPDATED", entityType: "JobOpening", entityId: id, ...meta })
  return jobOpening
}

export async function updateJobOpeningStatus(
  id: string,
  input: JobOpeningStatusUpdateInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  const existing = await prisma.jobOpening.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Job opening not found")
  await assertCanManageJobOpening(viewer, existing.verticalId)

  const jobOpening = await prisma.jobOpening.update({ where: { id }, data: { status: input.status } })

  await recordAuditLog({ userId: viewer.sub, action: "JOB_OPENING_STATUS_UPDATED", entityType: "JobOpening", entityId: id, metadata: { status: input.status }, ...meta })
  return jobOpening
}

export async function deleteJobOpening(id: string, viewer: AccessTokenPayload, meta: Meta) {
  const existing = await prisma.jobOpening.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Job opening not found")
  await assertCanManageJobOpening(viewer, existing.verticalId)

  const candidateCount = await prisma.candidate.count({ where: { jobOpeningId: id } })
  if (candidateCount > 0) throw new ValidationError("This job opening has candidates and can't be deleted — close it instead")

  await prisma.jobOpening.delete({ where: { id } })
  await recordAuditLog({ userId: viewer.sub, action: "JOB_OPENING_DELETED", entityType: "JobOpening", entityId: id, ...meta })
}

// ---------- Candidates ----------

export async function createCandidate(input: CandidateCreateInput, viewer: AccessTokenPayload, meta: Meta) {
  const jobOpening = await prisma.jobOpening.findUnique({ where: { id: input.jobOpeningId }, select: { id: true, verticalId: true } })
  if (!jobOpening) throw new NotFoundError("Job opening not found")
  await assertCanManageJobOpening(viewer, jobOpening.verticalId)

  const candidate = await prisma.candidate.create({
    data: {
      jobOpeningId: input.jobOpeningId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone || null,
      source: input.source || null,
      coverLetter: input.coverLetter || null,
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "CANDIDATE_ADDED", entityType: "Candidate", entityId: candidate.id, ...meta })
  return candidate
}

async function requireCandidateForEdit(candidateId: string, viewer: AccessTokenPayload) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { jobOpening: { select: { verticalId: true } } },
  })
  if (!candidate) throw new NotFoundError("Candidate not found")
  await assertCanManageJobOpening(viewer, candidate.jobOpening.verticalId)
  return candidate
}

export async function uploadCandidateResume(candidateId: string, file: File, viewer: AccessTokenPayload) {
  const candidate = await requireCandidateForEdit(candidateId, viewer)

  assertAllowedFile(file, ALLOWED_DOCUMENT_MIME_TYPES)
  const buffer = Buffer.from(await file.arrayBuffer())
  const { relativePath } = await saveUploadedFile(buffer, `candidates/${candidateId}`, file.name)

  if (candidate.resumeUrl) await deleteUploadedFile(candidate.resumeUrl)

  return prisma.candidate.update({
    where: { id: candidateId },
    data: { resumeUrl: relativePath, resumeFileName: file.name },
  })
}

export async function updateCandidateStage(
  candidateId: string,
  input: CandidateStageUpdateInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  const candidate = await requireCandidateForEdit(candidateId, viewer)
  if (input.stage === "HIRED") {
    throw new ValidationError("Use the hire action to move a candidate to Hired")
  }

  const updated = await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      stage: input.stage,
      rejectionReason: input.stage === "REJECTED" ? input.rejectionReason || null : null,
    },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "CANDIDATE_STAGE_UPDATED",
    entityType: "Candidate",
    entityId: candidateId,
    metadata: { from: candidate.stage, to: input.stage },
    ...meta,
  })
  return updated
}

/** Links a hired candidate to the Employee record just created for them (via the
 * normal employee-creation flow) and kicks off onboarding — the two systems meet
 * here without either mutation needing to know about the other's internals. */
export async function hireCandidate(candidateId: string, employeeId: string, viewer: AccessTokenPayload, meta: Meta) {
  const candidate = await requireCandidateForEdit(candidateId, viewer)
  if (candidate.hiredEmployeeId) throw new ValidationError("This candidate has already been hired")

  const employee = await prisma.employee.findUnique({ where: { id: employeeId, deletedAt: null }, select: { id: true } })
  if (!employee) throw new NotFoundError("Employee not found")

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { stage: "HIRED", hiredEmployeeId: employeeId },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "CANDIDATE_HIRED",
    entityType: "Candidate",
    entityId: candidateId,
    metadata: { employeeId },
    ...meta,
  })

  await initiateOnboarding(employeeId, viewer, meta)
}

// ---------- Interviews ----------

async function notifyPanelists(panelistEmployeeIds: string[], candidateName: string, roundName: string, scheduledAt: Date, link: string) {
  if (panelistEmployeeIds.length === 0) return
  const employees = await prisma.employee.findMany({
    where: { id: { in: panelistEmployeeIds } },
    select: { id: true, userId: true },
  })
  const when = scheduledAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
  await Promise.all(
    employees
      .filter((e) => e.userId)
      .map((e) =>
        notifyUser(
          e.userId!,
          e.id,
          "Interview panel assignment",
          `You're on the panel for ${candidateName}'s ${roundName} on ${when}.`,
          link
        )
      )
  )
}

export async function createInterview(candidateId: string, input: InterviewFormInput, viewer: AccessTokenPayload, meta: Meta) {
  const candidate = await requireCandidateForEdit(candidateId, viewer)

  const count = await prisma.employee.count({ where: { id: { in: input.panelistIds }, deletedAt: null, status: "ACTIVE" } })
  if (count !== input.panelistIds.length) throw new ValidationError("One or more panelists are invalid")

  const interview = await prisma.interview.create({
    data: {
      candidateId,
      roundName: input.roundName,
      scheduledAt: new Date(input.scheduledAt),
      durationMinutes: input.durationMinutes ? Number(input.durationMinutes) : null,
      location: input.location || null,
      createdById: viewer.sub,
      panelists: { create: input.panelistIds.map((employeeId) => ({ employeeId })) },
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "INTERVIEW_SCHEDULED", entityType: "Interview", entityId: interview.id, ...meta })

  await notifyPanelists(
    input.panelistIds,
    `${candidate.firstName} ${candidate.lastName}`,
    input.roundName,
    interview.scheduledAt,
    `/recruitment/candidates/${candidateId}`
  )

  return interview
}

export async function updateInterview(id: string, input: InterviewFormInput, viewer: AccessTokenPayload, meta: Meta) {
  const existing = await prisma.interview.findUnique({
    where: { id },
    include: {
      candidate: { include: { jobOpening: { select: { verticalId: true } } } },
      panelists: { select: { employeeId: true } },
    },
  })
  if (!existing) throw new NotFoundError("Interview not found")
  await assertCanManageJobOpening(viewer, existing.candidate.jobOpening.verticalId)

  const count = await prisma.employee.count({ where: { id: { in: input.panelistIds }, deletedAt: null, status: "ACTIVE" } })
  if (count !== input.panelistIds.length) throw new ValidationError("One or more panelists are invalid")

  const previousPanelistIds = new Set(existing.panelists.map((p) => p.employeeId))
  const newPanelistIds = input.panelistIds.filter((id) => !previousPanelistIds.has(id))

  const interview = await prisma.$transaction(async (tx) => {
    await tx.interviewPanelist.deleteMany({ where: { interviewId: id } })
    return tx.interview.update({
      where: { id },
      data: {
        roundName: input.roundName,
        scheduledAt: new Date(input.scheduledAt),
        durationMinutes: input.durationMinutes ? Number(input.durationMinutes) : null,
        location: input.location || null,
        panelists: { create: input.panelistIds.map((employeeId) => ({ employeeId })) },
      },
    })
  })

  await recordAuditLog({ userId: viewer.sub, action: "INTERVIEW_UPDATED", entityType: "Interview", entityId: id, ...meta })

  if (newPanelistIds.length > 0) {
    await notifyPanelists(
      newPanelistIds,
      `${existing.candidate.firstName} ${existing.candidate.lastName}`,
      input.roundName,
      interview.scheduledAt,
      `/recruitment/candidates/${existing.candidateId}`
    )
  }

  return interview
}

export async function updateInterviewStatus(id: string, input: InterviewStatusUpdateInput, viewer: AccessTokenPayload, meta: Meta) {
  const existing = await prisma.interview.findUnique({
    where: { id },
    include: { candidate: { include: { jobOpening: { select: { verticalId: true } } } } },
  })
  if (!existing) throw new NotFoundError("Interview not found")
  await assertCanManageJobOpening(viewer, existing.candidate.jobOpening.verticalId)

  const interview = await prisma.interview.update({ where: { id }, data: { status: input.status } })
  await recordAuditLog({ userId: viewer.sub, action: "INTERVIEW_STATUS_UPDATED", entityType: "Interview", entityId: id, metadata: { status: input.status }, ...meta })
  return interview
}

export async function deleteInterview(id: string, viewer: AccessTokenPayload, meta: Meta) {
  const existing = await prisma.interview.findUnique({
    where: { id },
    include: { candidate: { include: { jobOpening: { select: { verticalId: true } } } } },
  })
  if (!existing) throw new NotFoundError("Interview not found")
  await assertCanManageJobOpening(viewer, existing.candidate.jobOpening.verticalId)

  await prisma.interview.delete({ where: { id } })
  await recordAuditLog({ userId: viewer.sub, action: "INTERVIEW_DELETED", entityType: "Interview", entityId: id, ...meta })
}

// ---------- Feedback ----------

/** The signed-in panelist submits (or revises) their own scorecard for an interview
 * they're assigned to — a manage-role viewer can't submit on someone else's behalf. */
export async function submitInterviewFeedback(interviewId: string, input: InterviewFeedbackInput, viewer: AccessTokenPayload, meta: Meta) {
  if (!viewer.employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: { panelists: { select: { id: true, employeeId: true } } },
  })
  if (!interview) throw new NotFoundError("Interview not found")
  if (!isInterviewPanelist(viewer.employeeId, interview)) throw new ForbiddenError()

  const panelist = interview.panelists.find((p) => p.employeeId === viewer.employeeId)!

  const feedback = await prisma.interviewFeedback.upsert({
    where: { panelistId: panelist.id },
    update: { rating: Number(input.rating), recommendation: input.recommendation, comments: input.comments || null },
    create: { panelistId: panelist.id, rating: Number(input.rating), recommendation: input.recommendation, comments: input.comments || null },
  })

  await recordAuditLog({ userId: viewer.sub, action: "INTERVIEW_FEEDBACK_SUBMITTED", entityType: "Interview", entityId: interviewId, ...meta })
  return feedback
}
