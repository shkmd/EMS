import "server-only"

import { prisma } from "@/lib/prisma"
import { buildPaginationMeta } from "@/lib/api-response"
import type { NotificationListQuery } from "@/features/notifications/schemas"

export async function listRecentNotifications(userId: string, limit = 20) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ])

  return { items, unreadCount }
}

export async function listNotificationsPage(userId: string, query: NotificationListQuery) {
  const where = { userId, ...(query.unreadOnly ? { isRead: false } : {}) }

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.notification.count({ where }),
  ])

  return { items, pagination: buildPaginationMeta(query.page, query.pageSize, total) }
}
