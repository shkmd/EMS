import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageAnnouncements } from "@/features/announcements/authorization"
import type { AnnouncementFormInput } from "@/features/announcements/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageAnnouncements(viewer.role)) throw new ForbiddenError()
}

async function notifyUser(userId: string, employeeId: string | null, title: string, message: string, link: string) {
  try {
    await prisma.notification.create({ data: { userId, employeeId, type: "INFO", title, message, link } })
  } catch (error) {
    console.error("Failed to create notification:", error)
  }
}

async function notifyAnnouncementAudience(title: string, targetDepartmentId: string | null, authorUserId: string) {
  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      userId: { not: null },
      ...(targetDepartmentId ? { departmentId: targetDepartmentId } : {}),
    },
    select: { id: true, userId: true },
  })

  await Promise.all(
    employees
      .filter((e) => e.userId && e.userId !== authorUserId)
      .map((e) => notifyUser(e.userId!, e.id, "New announcement", title, "/announcements")),
  )
}

function toAnnouncementData(input: AnnouncementFormInput) {
  return {
    title: input.title,
    content: input.content,
    priority: input.priority,
    targetDepartmentId: input.targetDepartmentId || null,
    isPinned: input.isPinned,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
  }
}

export async function createAnnouncement(input: AnnouncementFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const announcement = await prisma.announcement.create({
    data: { ...toAnnouncementData(input), authorId: viewer.sub },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "ANNOUNCEMENT_CREATED",
    entityType: "Announcement",
    entityId: announcement.id,
    ...meta,
  })

  await notifyAnnouncementAudience(announcement.title, announcement.targetDepartmentId, viewer.sub)

  return announcement
}

export async function updateAnnouncement(id: string, input: AnnouncementFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.announcement.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Announcement not found")

  const announcement = await prisma.announcement.update({ where: { id }, data: toAnnouncementData(input) })

  await recordAuditLog({
    userId: viewer.sub,
    action: "ANNOUNCEMENT_UPDATED",
    entityType: "Announcement",
    entityId: id,
    ...meta,
  })

  return announcement
}

export async function deleteAnnouncement(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.announcement.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Announcement not found")

  await prisma.announcement.delete({ where: { id } })

  await recordAuditLog({
    userId: viewer.sub,
    action: "ANNOUNCEMENT_DELETED",
    entityType: "Announcement",
    entityId: id,
    ...meta,
  })
}

export async function togglePinAnnouncement(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.announcement.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Announcement not found")

  const announcement = await prisma.announcement.update({
    where: { id },
    data: { isPinned: !existing.isPinned },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: announcement.isPinned ? "ANNOUNCEMENT_PINNED" : "ANNOUNCEMENT_UNPINNED",
    entityType: "Announcement",
    entityId: id,
    ...meta,
  })

  return announcement
}
