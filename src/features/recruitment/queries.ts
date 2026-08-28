import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import { assertVerticalVisible, getVisibleVerticalIds } from "@/features/verticals/scope"
import { canManageRecruitment, isInterviewPanelist } from "@/features/recruitment/authorization"

const jobOpeningInclude = {
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, title: true } },
  vertical: { select: { id: true, name: true } },
  createdBy: { select: { id: true, email: true } },
  _count: { select: { candidates: true } },
} satisfies import("@prisma/client").Prisma.JobOpeningInclude

export async function listJobOpenings(viewer: AccessTokenPayload, includeClosed = false) {
  if (!canManageRecruitment(viewer.role)) throw new ForbiddenError()
  const visibleVerticalIds = await getVisibleVerticalIds(viewer)

  return prisma.jobOpening.findMany({
    where: {
      ...(includeClosed ? {} : { status: { in: ["OPEN", "ON_HOLD"] } }),
      ...(visibleVerticalIds !== null ? { verticalId: { in: visibleVerticalIds } } : {}),
    },
    include: jobOpeningInclude,
    orderBy: { createdAt: "desc" },
  })
}

export async function getJobOpening(id: string, viewer: AccessTokenPayload) {
  if (!canManageRecruitment(viewer.role)) throw new ForbiddenError()
  const jobOpening = await prisma.jobOpening.findUnique({ where: { id }, include: jobOpeningInclude })
  if (!jobOpening) throw new NotFoundError("Job opening not found")
  await assertVerticalVisible(viewer, jobOpening.verticalId)
  return jobOpening
}

const candidateListSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  stage: true,
  source: true,
  appliedAt: true,
  hiredEmployeeId: true,
  _count: { select: { interviews: true } },
} satisfies import("@prisma/client").Prisma.CandidateSelect

export async function listCandidates(jobOpeningId: string, viewer: AccessTokenPayload) {
  const jobOpening = await prisma.jobOpening.findUnique({ where: { id: jobOpeningId }, select: { verticalId: true } })
  if (!jobOpening) throw new NotFoundError("Job opening not found")
  if (!canManageRecruitment(viewer.role)) throw new ForbiddenError()
  await assertVerticalVisible(viewer, jobOpening.verticalId)

  return prisma.candidate.findMany({
    where: { jobOpeningId },
    select: candidateListSelect,
    orderBy: [{ stage: "asc" }, { appliedAt: "desc" }],
  })
}

const candidateDetailInclude = {
  jobOpening: { select: { id: true, title: true, verticalId: true } },
  interviews: {
    include: {
      panelists: {
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
          feedback: true,
        },
      },
      createdBy: { select: { id: true, email: true } },
    },
    orderBy: { scheduledAt: "desc" as const },
  },
} satisfies import("@prisma/client").Prisma.CandidateInclude

export async function getCandidate(id: string, viewer: AccessTokenPayload) {
  const candidate = await prisma.candidate.findUnique({ where: { id }, include: candidateDetailInclude })
  if (!candidate) throw new NotFoundError("Candidate not found")

  const isPanelistOnAnyInterview = candidate.interviews.some((i) => isInterviewPanelist(viewer.employeeId, i))
  if (!canManageRecruitment(viewer.role)) {
    if (!isPanelistOnAnyInterview) throw new ForbiddenError()
  } else {
    await assertVerticalVisible(viewer, candidate.jobOpening.verticalId)
  }

  return candidate
}

/** Interviews where the viewer is an assigned panelist — their personal "My Interviews" queue. */
export async function listMyInterviews(viewer: AccessTokenPayload) {
  if (!viewer.employeeId) return []

  return prisma.interview.findMany({
    where: { panelists: { some: { employeeId: viewer.employeeId } } },
    include: {
      candidate: { select: { id: true, firstName: true, lastName: true, jobOpening: { select: { title: true } } } },
      panelists: {
        where: { employeeId: viewer.employeeId },
        include: { feedback: true },
      },
    },
    orderBy: { scheduledAt: "desc" },
  })
}

export async function getInterview(id: string, viewer: AccessTokenPayload) {
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      candidate: { select: { id: true, firstName: true, lastName: true, jobOpening: { select: { verticalId: true } } } },
      panelists: {
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
          feedback: true,
        },
      },
    },
  })
  if (!interview) throw new NotFoundError("Interview not found")

  if (!canManageRecruitment(viewer.role)) {
    if (!isInterviewPanelist(viewer.employeeId, interview)) throw new ForbiddenError()
  } else {
    await assertVerticalVisible(viewer, interview.candidate.jobOpening.verticalId)
  }

  return interview
}
