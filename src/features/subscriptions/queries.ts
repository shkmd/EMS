import "server-only"

import { prisma } from "@/lib/prisma"

export async function listSubscriptions() {
  const subscriptions = await prisma.subscription.findMany({
    include: { notifyEmployee: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { endDate: "asc" },
  })

  return subscriptions.map((s) => ({
    ...s,
    cost: s.cost ? Number(s.cost) : null,
  }))
}

/** Active subscriptions renewing within the next `daysAhead` days (default
 * 30) — for a Dashboard "coming up" widget, not the full list. */
export async function getUpcomingSubscriptionRenewals(daysAhead = 30) {
  const now = new Date()
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  const subscriptions = await prisma.subscription.findMany({
    where: { status: "ACTIVE", endDate: { gte: now, lte: cutoff } },
    orderBy: { endDate: "asc" },
    take: 5,
  })

  return subscriptions.map((s) => ({ id: s.id, name: s.name, endDate: s.endDate }))
}
