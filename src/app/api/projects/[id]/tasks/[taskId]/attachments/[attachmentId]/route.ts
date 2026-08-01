import { NextRequest, NextResponse } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { NotFoundError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { readUploadedFile } from "@/lib/storage"
import { prisma } from "@/lib/prisma"
import { deleteTaskAttachment } from "@/features/projects/mutations"

type RouteParams = { params: Promise<{ attachmentId: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireSession()
    const { attachmentId } = await params

    const attachment = await prisma.taskAttachment.findUnique({ where: { id: attachmentId } })
    if (!attachment) throw new NotFoundError("Attachment not found")

    const buffer = await readUploadedFile(attachment.fileUrl)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": attachment.fileType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
      },
    })
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { attachmentId } = await params

    await deleteTaskAttachment(attachmentId, session)
    return apiSuccess(null, "Attachment deleted")
  } catch (error) {
    return apiError(error)
  }
}
