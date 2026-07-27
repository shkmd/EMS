import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { saveUploadedFile, assertAllowedFile, ALLOWED_DOCUMENT_MIME_TYPES, ALLOWED_PHOTO_MIME_TYPES } from "@/lib/storage"
import type { AccessTokenPayload } from "@/lib/jwt"
import { isConversationParticipant } from "@/features/messaging/authorization"
import { publishToUser } from "@/features/messaging/lib/realtime"
import type { SendMessageInput } from "@/features/messaging/schemas"

const ALLOWED_ATTACHMENT_MIME_TYPES = [...new Set([...ALLOWED_DOCUMENT_MIME_TYPES, ...ALLOWED_PHOTO_MIME_TYPES])]

export async function startConversation(targetUserId: string, viewer: AccessTokenPayload) {
  if (targetUserId === viewer.sub) throw new ValidationError("You can't start a conversation with yourself")

  const target = await prisma.user.findUnique({
    where: { id: targetUserId, isActive: true },
    select: { id: true },
  })
  if (!target) throw new NotFoundError("User not found")

  const [participantAId, participantBId] = [viewer.sub, targetUserId].sort()

  const conversation = await prisma.conversation.upsert({
    where: { participantAId_participantBId: { participantAId, participantBId } },
    update: {},
    create: { participantAId, participantBId },
  })

  return conversation
}

export async function sendMessage(
  conversationId: string,
  input: SendMessageInput,
  attachmentFile: File | null,
  viewer: AccessTokenPayload
) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conversation) throw new NotFoundError("Conversation not found")
  if (!isConversationParticipant(viewer.sub, conversation)) throw new ForbiddenError()

  const body = input.body?.trim() || null
  if (!body && !attachmentFile) throw new ValidationError("A message needs text or an attachment")

  let attachmentUrl: string | null = null
  let attachmentName: string | null = null
  let attachmentType: string | null = null
  let attachmentSize: number | null = null

  if (attachmentFile) {
    assertAllowedFile(attachmentFile, ALLOWED_ATTACHMENT_MIME_TYPES)
    const buffer = Buffer.from(await attachmentFile.arrayBuffer())
    const { relativePath } = await saveUploadedFile(buffer, `messages/${conversationId}`, attachmentFile.name)
    attachmentUrl = relativePath
    attachmentName = attachmentFile.name
    attachmentType = attachmentFile.type
    attachmentSize = attachmentFile.size
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId: viewer.sub,
        body,
        attachmentUrl,
        attachmentName,
        attachmentType,
        attachmentSize,
      },
    }),
    prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ])

  const recipientId = conversation.participantAId === viewer.sub ? conversation.participantBId : conversation.participantAId

  publishToUser(recipientId, {
    type: "message",
    conversationId,
    message: {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      body: message.body,
      attachmentUrl: message.attachmentUrl,
      attachmentName: message.attachmentName,
      attachmentType: message.attachmentType,
      attachmentSize: message.attachmentSize,
      createdAt: message.createdAt.toISOString(),
    },
  })

  return message
}

export async function markConversationRead(conversationId: string, viewer: AccessTokenPayload) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conversation) throw new NotFoundError("Conversation not found")
  if (!isConversationParticipant(viewer.sub, conversation)) throw new ForbiddenError()

  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: viewer.sub }, readAt: null },
    data: { readAt: new Date() },
  })
}
