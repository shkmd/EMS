import { NextRequest, NextResponse } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { readUploadedFile, mimeTypeFromExtension } from "@/lib/storage"
import { canManageLearning } from "@/features/learning/authorization"
import { prisma } from "@/lib/prisma"
import { uploadCourseContent } from "@/features/learning/mutations"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params

    const course = await prisma.course.findUnique({ where: { id } })
    if (!course) throw new NotFoundError("Course not found")
    if (!course.isPublished && !canManageLearning(session.role)) throw new NotFoundError("Course not found")
    if (!course.contentUrl) throw new NotFoundError("No content on file")

    const buffer = await readUploadedFile(course.contentUrl)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeTypeFromExtension(course.contentUrl),
        "Content-Disposition": `inline; filename="${encodeURIComponent(course.contentFileName ?? "content")}"`,
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

    const course = await uploadCourseContent(id, file, session)
    return apiSuccess({ course }, "Content uploaded")
  } catch (error) {
    return apiError(error)
  }
}
