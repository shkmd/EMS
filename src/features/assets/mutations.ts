import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageAssets } from "@/features/assets/authorization"
import type { AssetFormInput, AssignAssetInput, ReturnAssetInput } from "@/features/assets/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageAssets(viewer.role)) throw new ForbiddenError()
}

function toAssetData(input: AssetFormInput) {
  return {
    assetTag: input.assetTag,
    category: input.category,
    name: input.name,
    brand: input.brand && input.brand.trim() !== "" ? input.brand : null,
    model: input.model && input.model.trim() !== "" ? input.model : null,
    serialNumber: input.serialNumber && input.serialNumber.trim() !== "" ? input.serialNumber : null,
    purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
    purchaseCost: input.purchaseCost && input.purchaseCost.trim() !== "" ? Number(input.purchaseCost) : null,
    status: input.status,
  }
}

export async function createAsset(input: AssetFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  try {
    const asset = await prisma.asset.create({ data: toAssetData(input) })
    await recordAuditLog({ userId: viewer.sub, action: "ASSET_CREATED", entityType: "Asset", entityId: asset.id, ...meta })
    return asset
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("An asset with this tag already exists")
    }
    throw error
  }
}

export async function updateAsset(id: string, input: AssetFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.asset.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Asset not found")

  // ASSIGNED is only ever set by assignAsset (which also creates the
  // AssetAssignment record) and only ever cleared by returnAsset (which
  // closes it out). Editing it here directly would desync the asset's
  // status from its assignment history.
  if (input.status === "ASSIGNED" && existing.status !== "ASSIGNED") {
    throw new ValidationError('Use "Assign" to mark an asset as assigned, not a direct status edit')
  }
  if (existing.status === "ASSIGNED" && input.status !== "ASSIGNED") {
    throw new ValidationError('Use "Return" to change the status of an assigned asset')
  }

  try {
    const asset = await prisma.asset.update({ where: { id }, data: toAssetData(input) })
    await recordAuditLog({ userId: viewer.sub, action: "ASSET_UPDATED", entityType: "Asset", entityId: id, ...meta })
    return asset
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("An asset with this tag already exists")
    }
    throw error
  }
}

export async function deleteAsset(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.asset.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Asset not found")
  if (existing.status === "ASSIGNED") {
    throw new ValidationError("This asset is currently assigned — return it before deleting")
  }

  await prisma.asset.delete({ where: { id } })
  await recordAuditLog({ userId: viewer.sub, action: "ASSET_DELETED", entityType: "Asset", entityId: id, ...meta })
}

export async function assignAsset(input: AssignAssetInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const asset = await prisma.asset.findUnique({ where: { id: input.assetId } })
  if (!asset) throw new NotFoundError("Asset not found")
  if (asset.status !== "AVAILABLE") {
    throw new ValidationError(`This asset is not available (currently ${asset.status})`)
  }

  const employee = await prisma.employee.findUnique({ where: { id: input.employeeId, deletedAt: null } })
  if (!employee) throw new NotFoundError("Employee not found")

  const [, assignment] = await prisma.$transaction([
    prisma.asset.update({ where: { id: input.assetId }, data: { status: "ASSIGNED" } }),
    prisma.assetAssignment.create({
      data: {
        assetId: input.assetId,
        employeeId: input.employeeId,
        issuedDate: new Date(input.issuedDate),
        condition: input.condition || null,
        remarks: input.remarks || null,
        status: "ASSIGNED",
      },
    }),
  ])

  await recordAuditLog({
    userId: viewer.sub,
    action: "ASSET_ASSIGNED",
    entityType: "Asset",
    entityId: input.assetId,
    metadata: { employeeId: input.employeeId, assignmentId: assignment.id },
    ...meta,
  })

  return assignment
}

const RETURN_STATUS_TO_ASSET_STATUS = {
  RETURNED: "AVAILABLE",
  DAMAGED: "IN_REPAIR",
  LOST: "RETIRED",
} as const

export async function returnAsset(assignmentId: string, input: ReturnAssetInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const assignment = await prisma.assetAssignment.findUnique({ where: { id: assignmentId } })
  if (!assignment) throw new NotFoundError("Assignment not found")
  if (assignment.status !== "ASSIGNED") throw new ValidationError("This asset has already been returned")

  const [, updated] = await prisma.$transaction([
    prisma.asset.update({
      where: { id: assignment.assetId },
      data: { status: RETURN_STATUS_TO_ASSET_STATUS[input.status] },
    }),
    prisma.assetAssignment.update({
      where: { id: assignmentId },
      data: {
        status: input.status,
        returnDate: new Date(input.returnDate),
        condition: input.condition || assignment.condition,
        remarks: input.remarks || assignment.remarks,
      },
    }),
  ])

  await recordAuditLog({
    userId: viewer.sub,
    action: "ASSET_RETURNED",
    entityType: "Asset",
    entityId: assignment.assetId,
    metadata: { assignmentId, status: input.status },
    ...meta,
  })

  return updated
}
