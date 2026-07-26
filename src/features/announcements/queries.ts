import "server-only"

import { prisma } from "@/lib/prisma"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageAnnouncements } from "@/features/announcements/authorization"

const announcementInclude = {
  targetDepartment: { select: { id: true, name: true } },
  author: { select: { id: true, email: true, employee: { select: { firstName: true, lastName: true } } } },
} as const

export async function listAnnouncementsForViewer(viewer: AccessTokenPayload) {
  if (canManageAnnouncements(viewer.role)) {
    return prisma.announcement.findMany({
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      include: announcementInclude,
    })
  }

  let departmentId: string | null = null
  if (viewer.employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: viewer.employeeId },
      select: { departmentId: true },
    })
    departmentId = employee?.departmentId ?? null
  }

  const now = new Date()
  return prisma.announcement.findMany({
    where: {
      publishedAt: { lte: now },
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { OR: departmentId ? [{ targetDepartmentId: null }, { targetDepartmentId: departmentId }] : [{ targetDepartmentId: null }] },
      ],
    },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    include: announcementInclude,
  })
}
