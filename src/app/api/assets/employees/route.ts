import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canManageAssets } from "@/features/assets/authorization"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await requireSession()
    if (!canManageAssets(session.role)) throw new ForbiddenError()

    const employees = await prisma.employee.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    })
    return apiSuccess({ employees })
  } catch (error) {
    return apiError(error)
  }
}
