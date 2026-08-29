import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManagePolicies } from "@/features/policies/authorization"

function policyListSelect(viewerEmployeeId: string | null) {
  return {
    id: true,
    title: true,
    category: true,
    version: true,
    effectiveDate: true,
    isPublished: true,
    requiresAcknowledgment: true,
    createdAt: true,
    _count: { select: { acknowledgments: true } },
    acknowledgments: viewerEmployeeId ? { where: { employeeId: viewerEmployeeId }, select: { id: true } } : false,
  } satisfies import("@prisma/client").Prisma.PolicySelect
}

export async function listPolicies(viewer: AccessTokenPayload, includeUnpublished = false) {
  const canManage = canManagePolicies(viewer.role)
  return prisma.policy.findMany({
    where: includeUnpublished && canManage ? {} : { isPublished: true },
    select: policyListSelect(viewer.employeeId ?? null),
    orderBy: { createdAt: "desc" },
  })
}

export async function getPolicy(id: string, viewer: AccessTokenPayload) {
  const policy = await prisma.policy.findUnique({ where: { id } })
  if (!policy) throw new NotFoundError("Policy not found")
  if (!policy.isPublished && !canManagePolicies(viewer.role)) throw new ForbiddenError()

  const myAcknowledgment = viewer.employeeId
    ? await prisma.policyAcknowledgment.findUnique({ where: { policyId_employeeId: { policyId: id, employeeId: viewer.employeeId } } })
    : null

  return { policy, myAcknowledgment }
}

export async function listAcknowledgmentsForPolicy(policyId: string, viewer: AccessTokenPayload) {
  if (!canManagePolicies(viewer.role)) throw new ForbiddenError()
  return prisma.policyAcknowledgment.findMany({
    where: { policyId },
    include: { employee: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } } },
    orderBy: { acknowledgedAt: "desc" },
  })
}
