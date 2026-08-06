import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { saveUploadedFile, assertAllowedFile, ALLOWED_DOCUMENT_MIME_TYPES, ALLOWED_PHOTO_MIME_TYPES } from "@/lib/storage"
import type { AccessTokenPayload } from "@/lib/jwt"
import { isConversationParticipant } from "@/features/messaging/authorization"
import { publishToUser } from "@/features/messaging/lib/realtime"
import type { SendMessageInput, CallSignalInput } from "@/features/messaging/schemas"

const ALLOWED_ATTACHMENT_MIME_TYPES = [...new Set([...ALLOWED_DOCUMENT_MIME_TYPES, ...ALLOWED_PHOTO_MIME_TYPES])]

export async function startConversation(targetUserId: string, viewer: AccessTokenPayload) {
  if (targetUserId === viewer.sub) throw new ValidationError("You can't start a conversation with yourself")

  const target = await prisma.user.findUnique({
    where: { id: targetUserId, isActive: true },
    select: { id: true },
  })
  if (!target) throw new NotFoundError("User not found")

  // A 1:1 conversation between this pair, if one already exists — checked
  // via the participant join table rather than a unique-columns constraint,
  // since group conversations share the same table.
  const existing = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      AND: [{ participants: { some: { userId: viewer.sub } } }, { participants: { some: { userId: targetUserId } } }],
    },
  })
  if (existing) return existing

  return prisma.conversation.create({
    data: {
      isGroup: false,
      createdById: viewer.sub,
      participants: { create: [{ userId: viewer.sub }, { userId: targetUserId }] },
    },
  })
}

export async function createGroupConversation(name: string, participantUserIds: string[], viewer: AccessTokenPayload) {
  const uniqueIds = [...new Set(participantUserIds.filter((id) => id !== viewer.sub))]
  if (uniqueIds.length < 2) throw new ValidationError("Pick at least 2 other people for a group")

  const validUsers = await prisma.user.findMany({
    where: { id: { in: uniqueIds }, isActive: true },
    select: { id: true },
  })
  if (validUsers.length !== uniqueIds.length) throw new ValidationError("One or more selected users are unavailable")

  return prisma.conversation.create({
    data: {
      isGroup: true,
      name,
      createdById: viewer.sub,
      participants: { create: [{ userId: viewer.sub }, ...uniqueIds.map((userId) => ({ userId }))] },
    },
  })
}

export async function sendMessage(
  conversationId: string,
  input: SendMessageInput,
  attachmentFile: File | null,
  viewer: AccessTokenPayload
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { select: { userId: true } } },
  })
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

  const recipientIds = conversation.participants.map((p) => p.userId).filter((id) => id !== viewer.sub)
  for (const recipientId of recipientIds) {
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
  }

  return message
}

const POINT_TO_POINT_KINDS = ["offer", "answer", "ice-candidate"] as const

export async function relayCallSignal(conversationId: string, signal: CallSignalInput, viewer: AccessTokenPayload) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { select: { userId: true } } },
  })
  if (!conversation) throw new NotFoundError("Conversation not found")
  if (!isConversationParticipant(viewer.sub, conversation)) throw new ForbiddenError()

  const otherParticipantIds = conversation.participants.map((p) => p.userId).filter((id) => id !== viewer.sub)

  const isPointToPoint = (POINT_TO_POINT_KINDS as readonly string[]).includes(signal.kind)
  if (isPointToPoint) {
    const toUserId = (signal as { toUserId: string }).toUserId
    if (!otherParticipantIds.includes(toUserId)) throw new ForbiddenError()
    publishToUser(toUserId, { type: "call-signal", conversationId, fromUserId: viewer.sub, signal })
    return
  }

  for (const targetId of otherParticipantIds) {
    publishToUser(targetId, { type: "call-signal", conversationId, fromUserId: viewer.sub, signal })
  }
}

export async function markConversationRead(conversationId: string, viewer: AccessTokenPayload) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { select: { userId: true } } },
  })
  if (!conversation) throw new NotFoundError("Conversation not found")
  if (!isConversationParticipant(viewer.sub, conversation)) throw new ForbiddenError()

  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId: viewer.sub },
    data: { lastReadAt: new Date() },
  })
}
