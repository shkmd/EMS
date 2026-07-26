import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { buildPaginationMeta } from "@/lib/api-response"
import type { AuditLogQuery } from "@/features/audit/schemas"

const auditLogInclude = {
  user: { select: { id: true, email: true, employee: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.AuditLogInclude

export async function listAuditLogs(query: AuditLogQuery) {
  const where: Prisma.AuditLogWhereInput = {}
  if (query.entityType) where.entityType = query.entityType
  if (query.action) where.action = query.action
  if (query.userId) where.userId = query.userId

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {}
    if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom)
    if (query.dateTo) {
      // `dateTo` is a plain "YYYY-MM-DD" (parses as UTC midnight) — use an
      // exclusive upper bound of the *next* UTC day so the entire selected
      // day is included, not just events before its first millisecond.
      const exclusiveEnd = new Date(query.dateTo)
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1)
      where.createdAt.lt = exclusiveEnd
    }
  }

  if (query.search) {
    where.OR = [{ entityId: { contains: query.search } }, { user: { email: { contains: query.search } } }]
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: auditLogInclude,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  return { items, pagination: buildPaginationMeta(query.page, query.pageSize, total) }
}

export async function listAuditLogFilterOptions() {
  const [entityTypes, actions] = await Promise.all([
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ])

  return {
    entityTypes: entityTypes.map((e) => e.entityType),
    actions: actions.map((a) => a.action),
  }
}
