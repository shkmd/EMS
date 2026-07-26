import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

type AuditInput = {
  userId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Fire-and-forget audit trail write. Failures are logged but never thrown —
 * an audit-log outage must not block the business action it's recording.
 */
export async function recordAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    })
  } catch (error) {
    console.error("Failed to write audit log:", error)
  }
}
