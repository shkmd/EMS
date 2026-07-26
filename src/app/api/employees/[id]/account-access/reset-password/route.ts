import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { requestPasswordReset } from "@/features/auth/service"
import { canManageEmployees } from "@/features/employees/authorization"

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    if (!canManageEmployees(session.role)) throw new ForbiddenError()

    const { id } = await params
    const employee = await prisma.employee.findUnique({ where: { id, deletedAt: null }, select: { email: true, userId: true } })
    if (!employee) throw new NotFoundError("Employee not found")
    if (!employee.userId) throw new ValidationError("This employee doesn't have portal access yet")

    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }
    await requestPasswordReset(employee.email, meta)

    return apiSuccess(null, "Password reset email sent")
  } catch (error) {
    return apiError(error)
  }
}
