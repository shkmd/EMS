import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageDepartments } from "@/features/departments/authorization"
import type { DepartmentFormInput } from "@/features/departments/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageDepartments(viewer.role)) throw new ForbiddenError()
}

function toData(input: DepartmentFormInput) {
  return {
    name: input.name,
    description: input.description && input.description.trim() !== "" ? input.description : null,
    headId: input.headId && input.headId.trim() !== "" ? input.headId : null,
  }
}

function handleUniqueConstraintError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    // MySQL reports `meta.target` as a single index-name string (e.g.
    // "departments_headId_key"); Postgres reports it as an array of column
    // names. Normalize both shapes before inspecting it.
    const target = error.meta?.target
    const targetStr = Array.isArray(target) ? target.join(",") : String(target ?? "")
    if (targetStr.includes("headId")) {
      throw new ConflictError("This employee is already the head of another department")
    }
    throw new ConflictError("A department with this name already exists")
  }
  throw error
}

export async function createDepartment(input: DepartmentFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  try {
    const department = await prisma.department.create({ data: toData(input) })
    await recordAuditLog({
      userId: viewer.sub,
      action: "DEPARTMENT_CREATED",
      entityType: "Department",
      entityId: department.id,
      ...meta,
    })
    return department
  } catch (error) {
    handleUniqueConstraintError(error)
  }
}

export async function updateDepartment(
  id: string,
  input: DepartmentFormInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  assertCanManage(viewer)

  const existing = await prisma.department.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Department not found")

  try {
    const department = await prisma.department.update({ where: { id }, data: toData(input) })
    await recordAuditLog({
      userId: viewer.sub,
      action: "DEPARTMENT_UPDATED",
      entityType: "Department",
      entityId: id,
      ...meta,
    })
    return department
  } catch (error) {
    handleUniqueConstraintError(error)
  }
}

export async function deleteDepartment(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.department.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Department not found")

  await prisma.department.delete({ where: { id } })

  await recordAuditLog({
    userId: viewer.sub,
    action: "DEPARTMENT_DELETED",
    entityType: "Department",
    entityId: id,
    ...meta,
  })
}
