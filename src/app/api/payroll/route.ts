import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { listPayslips } from "@/features/payroll/queries"
import { payslipListQuerySchema } from "@/features/payroll/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const query = payslipListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const payslips = await listPayslips(query, session)
    return apiSuccess({ payslips })
  } catch (error) {
    return apiError(error)
  }
}
