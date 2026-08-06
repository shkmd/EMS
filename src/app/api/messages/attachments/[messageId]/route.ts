import { NextRequest, NextResponse } from "next/server"

import { apiError } from "@/lib/api-response"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { readUploadedFile } from "@/lib/storage"
import { prisma } from "@/lib/prisma"
import { isConversationParticipant } from "@/features/messaging/authorization"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const session = await requireSession()
    const { messageId } = await params

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { participants: { select: { userId: true } } } } },
    })
    if (!message) throw new NotFoundError("Message not found")
    if (!isConversationParticipant(session.sub, message.conversation)) throw new ForbiddenError()
    if (!message.attachmentUrl || !message.attachmentName) throw new NotFoundError("No attachment on this message")

    const buffer = await readUploadedFile(message.attachmentUrl)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": message.attachmentType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(message.attachmentName)}"`,
      },
    })
  } catch (error) {
    return apiError(error)
  }
}
