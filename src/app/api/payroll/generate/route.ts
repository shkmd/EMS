import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { generatePayslip } from "@/features/payroll/mutations"
import { payslipFormSchema } from "@/features/payroll/schemas"

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = payslipFormSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const payslip = await generatePayslip(body, session, meta)
    return apiSuccess({ payslip }, "Payslip generated", 201)
  } catch (error) {
    return apiError(error)
  }
}
