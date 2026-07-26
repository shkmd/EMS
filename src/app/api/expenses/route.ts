import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ValidationError } from "@/lib/errors"
import { listExpenseClaims } from "@/features/expenses/queries"
import { submitExpenseClaim } from "@/features/expenses/mutations"
import { expenseClaimFormSchema, expenseListQuerySchema } from "@/features/expenses/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const query = expenseListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const claims = await listExpenseClaims(query, session)
    return apiSuccess({ claims })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()

    const formData = await req.formData()
    const receiptFile = formData.get("receipt")
    if (receiptFile !== null && !(receiptFile instanceof File)) {
      throw new ValidationError("Invalid receipt file")
    }

    const body = expenseClaimFormSchema.parse({
      category: formData.get("category"),
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      amount: formData.get("amount"),
      expenseDate: formData.get("expenseDate"),
    })

    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }
    const claim = await submitExpenseClaim(body, receiptFile as File | null, session, meta)

    return apiSuccess({ claim }, "Expense claim submitted", 201)
  } catch (error) {
    return apiError(error)
  }
}
