import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { getPayslipDetail } from "@/features/payroll/queries"
import { deletePayslip } from "@/features/payroll/mutations"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const payslip = await getPayslipDetail(id, session)
    return apiSuccess({ payslip })
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deletePayslip(id, session, meta)
    return apiSuccess(null, "Payslip deleted")
  } catch (error) {
    return apiError(error)
  }
}
