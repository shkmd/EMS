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
