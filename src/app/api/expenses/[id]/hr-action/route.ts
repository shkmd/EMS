import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { hrAction } from "@/features/expenses/mutations"
import { expenseActionSchema } from "@/features/expenses/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = expenseActionSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const claim = await hrAction(id, body, session, meta)
    return apiSuccess({ claim }, "Expense claim updated")
  } catch (error) {
    return apiError(error)
  }
}
