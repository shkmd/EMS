import { NextRequest, NextResponse } from "next/server"

import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { ValidationError, NotFoundError } from "@/lib/errors"
import { readUploadedFile, mimeTypeFromExtension } from "@/lib/storage"
import { prisma } from "@/lib/prisma"
import { uploadTemplateImage, deleteTemplateImage } from "@/features/hr-documents/mutations"
import { templateTypeValues, type TemplateType } from "@/features/hr-documents/templates"

function assertValidType(type: string): asserts type is TemplateType {
  if (!templateTypeValues.includes(type as TemplateType)) {
    throw new ValidationError("Unknown document template type")
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    await requireSession()
    const { type } = await params
    assertValidType(type)

    const template = await prisma.documentTemplate.findUnique({ where: { type } })
    if (!template?.imageUrl) throw new NotFoundError("No image uploaded for this template")

    const buffer = await readUploadedFile(template.imageUrl)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeTypeFromExtension(template.imageUrl),
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const session = await requireSession()
    const { type } = await params
    assertValidType(type)

    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) throw new ValidationError("A file is required")

    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }
    await uploadTemplateImage(type, file, session, meta)

    return apiSuccess(null, "Image uploaded")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const session = await requireSession()
    const { type } = await params
    assertValidType(type)
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteTemplateImage(type, session, meta)
    return apiSuccess(null, "Image removed")
  } catch (error) {
    return apiError(error)
  }
}
