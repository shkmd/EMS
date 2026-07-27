import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import { isConversationParticipant } from "@/features/messaging/authorization"
import type { MessagesListQuery } from "@/features/messaging/schemas"

const participantSelect = {
  id: true,
  firstName: true,
  lastName: true,
  profilePhotoUrl: true,
} satisfies Record<string, true>

export async function listConversations(viewerEmployeeId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ participantAId: viewerEmployeeId }, { participantBId: viewerEmployeeId }] },
    include: {
      participantA: { select: participantSelect },
      participantB: { select: participantSelect },
      messages: { take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const conversationIds = conversations.map((c) => c.id)
  const unreadGroups =
    conversationIds.length > 0
      ? await prisma.message.groupBy({
          by: ["conversationId"],
          where: { conversationId: { in: conversationIds }, senderId: { not: viewerEmployeeId }, readAt: null },
          _count: { _all: true },
        })
      : []
  const unreadByConversation = new Map(unreadGroups.map((g) => [g.conversationId, g._count._all]))

  return conversations.map((c) => {
    const other = c.participantAId === viewerEmployeeId ? c.participantB : c.participantA
    const lastMessage = c.messages[0] ?? null
    return {
      id: c.id,
      other,
      lastMessage: lastMessage
        ? {
            body: lastMessage.body,
            attachmentName: lastMessage.attachmentName,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt,
          }
        : null,
      unreadCount: unreadByConversation.get(c.id) ?? 0,
      updatedAt: c.updatedAt,
    }
  })
}

export async function getConversationForViewer(conversationId: string, viewerEmployeeId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participantA: { select: participantSelect },
      participantB: { select: participantSelect },
    },
  })
  if (!conversation) throw new NotFoundError("Conversation not found")
  if (!isConversationParticipant(viewerEmployeeId, conversation)) throw new ForbiddenError()

  const other = conversation.participantAId === viewerEmployeeId ? conversation.participantB : conversation.participantA
  return { id: conversation.id, other }
}

export async function listMessages(conversationId: string, viewerEmployeeId: string, query: MessagesListQuery) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conversation) throw new NotFoundError("Conversation not found")
  if (!isConversationParticipant(viewerEmployeeId, conversation)) throw new ForbiddenError()

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  })

  const hasMore = messages.length > query.limit
  const page = hasMore ? messages.slice(0, query.limit) : messages
  return { messages: page.reverse(), hasMore, nextCursor: hasMore ? page[0]?.id : undefined }
}

export async function listMessageableEmployees(viewerEmployeeId: string) {
  return prisma.employee.findMany({
    where: { deletedAt: null, status: "ACTIVE", id: { not: viewerEmployeeId } },
    select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })
}

export async function getTotalUnreadCount(viewerEmployeeId: string) {
  return prisma.message.count({
    where: {
      readAt: null,
      senderId: { not: viewerEmployeeId },
      conversation: { OR: [{ participantAId: viewerEmployeeId }, { participantBId: viewerEmployeeId }] },
    },
  })
}
