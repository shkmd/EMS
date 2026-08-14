import "server-only"

import { prisma } from "@/lib/prisma"

export async function getActiveOffboarding(employeeId: string) {
  return prisma.offboarding.findFirst({
    where: { employeeId, status: "IN_PROGRESS" },
    include: { initiatedBy: { select: { email: true } } },
  })
}

export async function getOffboardingHistory(employeeId: string) {
  return prisma.offboarding.findMany({
    where: { employeeId },
    include: { initiatedBy: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export async function listInProgressOffboardings() {
  const offboardings = await prisma.offboarding.findMany({
    where: { status: "IN_PROGRESS" },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          profilePhotoUrl: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { lastWorkingDay: "asc" },
  })

  const outstandingAssetCounts = await prisma.assetAssignment.groupBy({
    by: ["employeeId"],
    where: { employeeId: { in: offboardings.map((o) => o.employeeId) }, status: "ASSIGNED" },
    _count: true,
  })
  const outstandingByEmployee = new Map(outstandingAssetCounts.map((c) => [c.employeeId, c._count]))

  return offboardings.map((o) => ({ ...o, outstandingAssets: outstandingByEmployee.get(o.employeeId) ?? 0 }))
}
