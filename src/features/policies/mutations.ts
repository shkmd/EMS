import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManagePolicies } from "@/features/policies/authorization"
import type { PolicyFormInput } from "@/features/policies/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManagePolicies(viewer.role)) throw new ForbiddenError()
}

export async function createPolicy(input: PolicyFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const policy = await prisma.policy.create({
    data: {
      title: input.title,
      category: input.category || null,
      content: input.content || null,
      version: input.version || null,
      effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
      isPublished: input.isPublished,
      requiresAcknowledgment: input.requiresAcknowledgment,
      createdById: viewer.sub,
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "POLICY_CREATED", entityType: "Policy", entityId: policy.id, ...meta })
  return policy
}

export async function updatePolicy(id: string, input: PolicyFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.policy.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Policy not found")

  const policy = await prisma.policy.update({
    where: { id },
    data: {
      title: input.title,
      category: input.category || null,
      content: input.content || null,
      version: input.version || null,
      effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
      isPublished: input.isPublished,
      requiresAcknowledgment: input.requiresAcknowledgment,
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "POLICY_UPDATED", entityType: "Policy", entityId: id, ...meta })
  return policy
}

export async function deletePolicy(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.policy.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Policy not found")

  await prisma.policy.delete({ where: { id } })
  await recordAuditLog({ userId: viewer.sub, action: "POLICY_DELETED", entityType: "Policy", entityId: id, ...meta })
}

export async function acknowledgePolicy(policyId: string, viewer: AccessTokenPayload, meta: Meta) {
  if (!viewer.employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")

  const policy = await prisma.policy.findUnique({ where: { id: policyId } })
  if (!policy) throw new NotFoundError("Policy not found")
  if (!policy.isPublished) throw new ForbiddenError()

  const acknowledgment = await prisma.policyAcknowledgment.upsert({
    where: { policyId_employeeId: { policyId, employeeId: viewer.employeeId } },
    update: {},
    create: { policyId, employeeId: viewer.employeeId },
  })

  await recordAuditLog({ userId: viewer.sub, action: "POLICY_ACKNOWLEDGED", entityType: "Policy", entityId: policyId, ...meta })
  return acknowledgment
}
