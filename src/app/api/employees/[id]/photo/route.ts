import { NextRequest, NextResponse } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors"
import { readUploadedFile, mimeTypeFromExtension } from "@/lib/storage"
import { uploadEmployeePhoto } from "@/features/employees/mutations"
import { canAccessEmployee } from "@/features/employees/authorization"
import { prisma } from "@/lib/prisma"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params

    const employee = await prisma.employee.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, reportingManagerId: true, profilePhotoUrl: true, updatedAt: true },
    })
    if (!employee) throw new NotFoundError("Employee not found")
    if (!canAccessEmployee(session, employee)) throw new ForbiddenError()
    if (!employee.profilePhotoUrl) throw new NotFoundError("No photo uploaded")

    const buffer = await readUploadedFile(employee.profilePhotoUrl)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeTypeFromExtension(employee.profilePhotoUrl),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params

    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) throw new ValidationError("A file is required")

    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }
    await uploadEmployeePhoto(id, file, session, meta)

    return apiSuccess(null, "Photo updated")
  } catch (error) {
    return apiError(error)
  }
}
