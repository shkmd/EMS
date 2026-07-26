import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"

export async function markNotificationRead(id: string, userId: string) {
  const notification = await prisma.notification.findUnique({ where: { id } })
  if (!notification) throw new NotFoundError("Notification not found")
  if (notification.userId !== userId) throw new ForbiddenError()

  return prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  })
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })
}
