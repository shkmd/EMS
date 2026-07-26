import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageDesignations } from "@/features/designations/authorization"
import type { DesignationFormInput } from "@/features/designations/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageDesignations(viewer.role)) throw new ForbiddenError()
}

function toData(input: DesignationFormInput) {
  return {
    title: input.title,
    departmentId: input.departmentId && input.departmentId.trim() !== "" ? input.departmentId : null,
    description: input.description && input.description.trim() !== "" ? input.description : null,
  }
}

function handleUniqueConstraintError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ConflictError("A designation with this title already exists in that department")
  }
  throw error
}

export async function createDesignation(input: DesignationFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  try {
    const designation = await prisma.designation.create({ data: toData(input) })
    await recordAuditLog({
      userId: viewer.sub,
      action: "DESIGNATION_CREATED",
      entityType: "Designation",
      entityId: designation.id,
      ...meta,
    })
    return designation
  } catch (error) {
    handleUniqueConstraintError(error)
  }
}

export async function updateDesignation(
  id: string,
  input: DesignationFormInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  assertCanManage(viewer)

  const existing = await prisma.designation.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Designation not found")

  try {
    const designation = await prisma.designation.update({ where: { id }, data: toData(input) })
    await recordAuditLog({
      userId: viewer.sub,
      action: "DESIGNATION_UPDATED",
      entityType: "Designation",
      entityId: id,
      ...meta,
    })
    return designation
  } catch (error) {
    handleUniqueConstraintError(error)
  }
}

export async function deleteDesignation(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.designation.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Designation not found")

  await prisma.designation.delete({ where: { id } })

  await recordAuditLog({
    userId: viewer.sub,
    action: "DESIGNATION_DELETED",
    entityType: "Designation",
    entityId: id,
    ...meta,
  })
}
