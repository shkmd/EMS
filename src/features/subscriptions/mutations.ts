import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageSubscriptions } from "@/features/subscriptions/authorization"
import type { SubscriptionInput } from "@/features/subscriptions/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function toData(input: SubscriptionInput) {
  return {
    name: input.name,
    vendor: input.vendor || null,
    category: input.category || null,
    cost: input.cost && input.cost.trim() !== "" ? input.cost : null,
    billingCycle: input.billingCycle,
    startDate: input.startDate ? new Date(input.startDate) : null,
    endDate: new Date(input.endDate),
    notifyEmployeeId: input.notifyEmployeeId || null,
    notes: input.notes || null,
    status: input.status,
  }
}

export async function createSubscription(input: SubscriptionInput, viewer: AccessTokenPayload, meta: Meta) {
  if (!canManageSubscriptions(viewer.role)) throw new ForbiddenError()

  const subscription = await prisma.subscription.create({ data: toData(input) })

  await recordAuditLog({
    userId: viewer.sub,
    action: "SUBSCRIPTION_CREATED",
    entityType: "Subscription",
    entityId: subscription.id,
    ...meta,
  })

  return subscription
}

export async function updateSubscription(id: string, input: SubscriptionInput, viewer: AccessTokenPayload, meta: Meta) {
  if (!canManageSubscriptions(viewer.role)) throw new ForbiddenError()

  const existing = await prisma.subscription.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Subscription not found")

  const data = toData(input)
  // A changed end date means a new renewal cycle to remind about — clear
  // the dedupe marker so the scheduler doesn't think this cycle's reminder
  // already went out.
  const clearReminder = existing.endDate.getTime() !== data.endDate.getTime()

  const subscription = await prisma.subscription.update({
    where: { id },
    data: { ...data, ...(clearReminder ? { reminderSentAt: null } : {}) },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "SUBSCRIPTION_UPDATED",
    entityType: "Subscription",
    entityId: id,
    ...meta,
  })

  return subscription
}

export async function deleteSubscription(id: string, viewer: AccessTokenPayload, meta: Meta) {
  if (!canManageSubscriptions(viewer.role)) throw new ForbiddenError()

  const existing = await prisma.subscription.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Subscription not found")

  await prisma.subscription.delete({ where: { id } })

  await recordAuditLog({
    userId: viewer.sub,
    action: "SUBSCRIPTION_DELETED",
    entityType: "Subscription",
    entityId: id,
    ...meta,
  })
}
