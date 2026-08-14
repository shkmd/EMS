import { z } from "zod"

import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"

const bodySchema = z.object({ endpoint: z.string().min(1) })

export async function POST(req: Request) {
  try {
    const session = await requireSession()
    const { endpoint } = bodySchema.parse(await req.json())

    await prisma.pushSubscription.deleteMany({ where: { userId: session.sub, endpoint } })

    return apiSuccess(null, "Push notifications disabled")
  } catch (error) {
    return apiError(error)
  }
}
