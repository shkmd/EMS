import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/errors"

export async function GET() {
  try {
    const session = await requireSession()

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        email: true,
        role: true,
        mustChangePassword: true,
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            department: { select: { name: true } },
            designation: { select: { title: true } },
          },
        },
      },
    })

    if (!user) throw new NotFoundError("User not found")

    return apiSuccess({ user })
  } catch (error) {
    return apiError(error)
  }
}
