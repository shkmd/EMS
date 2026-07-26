import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/errors"
import type { AssetListQuery } from "@/features/assets/schemas"

const currentAssignmentInclude = {
  assignments: {
    where: { status: "ASSIGNED" as const },
    take: 1,
    include: { employee: { select: { id: true, firstName: true, lastName: true } } },
  },
} satisfies Prisma.AssetInclude

export async function listAssets(query: AssetListQuery) {
  const where: Prisma.AssetWhereInput = {}
  if (query.category) where.category = query.category
  if (query.status) where.status = query.status
  if (query.search) {
    where.OR = [
      { assetTag: { contains: query.search } },
      { name: { contains: query.search } },
      { serialNumber: { contains: query.search } },
    ]
  }

  const assets = await prisma.asset.findMany({
    where,
    include: currentAssignmentInclude,
    orderBy: { assetTag: "asc" },
  })

  return assets.map((a) => ({ ...a, currentAssignment: a.assignments[0] ?? null }))
}

export async function getAssetById(id: string) {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      assignments: {
        orderBy: { issuedDate: "desc" },
        include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  })
  if (!asset) throw new NotFoundError("Asset not found")
  return asset
}

export async function listAvailableAssets() {
  return prisma.asset.findMany({ where: { status: "AVAILABLE" }, orderBy: { assetTag: "asc" } })
}

export async function listMyAssetAssignments(employeeId: string) {
  return prisma.assetAssignment.findMany({
    where: { employeeId },
    include: { asset: true },
    orderBy: { issuedDate: "desc" },
  })
}
