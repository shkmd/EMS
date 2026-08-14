import { z } from "zod"

import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"

const bodySchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
})

export async function POST(req: Request) {
  try {
    const session = await requireSession()
    const { endpoint, keys } = bodySchema.parse(await req.json())

    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: session.sub, endpoint } },
      update: { p256dh: keys.p256dh, auth: keys.auth },
      create: { userId: session.sub, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    })

    return apiSuccess(null, "Push notifications enabled")
  } catch (error) {
    return apiError(error)
  }
}
