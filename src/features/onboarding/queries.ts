import "server-only"

import { prisma } from "@/lib/prisma"

export async function getActiveOnboarding(employeeId: string) {
  return prisma.onboarding.findFirst({
    where: { employeeId, status: "IN_PROGRESS" },
    include: { initiatedBy: { select: { email: true } } },
  })
}

export async function getOnboardingHistory(employeeId: string) {
  return prisma.onboarding.findMany({
    where: { employeeId },
    include: { initiatedBy: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export async function listInProgressOnboardings() {
  const onboardings = await prisma.onboarding.findMany({
    where: { status: "IN_PROGRESS" },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          profilePhotoUrl: true,
          dateOfJoining: true,
          userId: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  const employeeIds = onboardings.map((o) => o.employeeId)
  const [assetCounts, users] = await Promise.all([
    prisma.assetAssignment.groupBy({
      by: ["employeeId"],
      where: { employeeId: { in: employeeIds }, status: "ASSIGNED" },
      _count: true,
    }),
    prisma.user.findMany({
      where: { id: { in: onboardings.map((o) => o.employee.userId).filter((id): id is string => !!id) } },
      select: { id: true, isActive: true },
    }),
  ])
  const assetsByEmployee = new Map(assetCounts.map((c) => [c.employeeId, c._count]))
  const activeByUserId = new Map(users.map((u) => [u.id, u.isActive]))

  return onboardings.map((o) => ({
    ...o,
    assetsAssigned: assetsByEmployee.get(o.employeeId) ?? 0,
    portalAccessGranted: o.employee.userId ? (activeByUserId.get(o.employee.userId) ?? false) : false,
  }))
}
