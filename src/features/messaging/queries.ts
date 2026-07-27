import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import { isConversationParticipant } from "@/features/messaging/authorization"
import type { MessagesListQuery } from "@/features/messaging/schemas"
import type { ParticipantRef } from "@/features/messaging/lib/types"

const participantSelect = {
  id: true,
  email: true,
  employee: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
} satisfies Record<string, unknown>

type ParticipantRow = {
  id: string
  email: string
  employee: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null } | null
}

function toParticipantRef(user: ParticipantRow): ParticipantRef {
  return {
    id: user.id,
    name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email.split("@")[0]!,
    profilePhotoUrl: user.employee?.profilePhotoUrl ?? null,
    employeeId: user.employee?.id ?? null,
  }
}

export async function listConversations(viewerUserId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ participantAId: viewerUserId }, { participantBId: viewerUserId }] },
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
          where: { conversationId: { in: conversationIds }, senderId: { not: viewerUserId }, readAt: null },
          _count: { _all: true },
        })
      : []
  const unreadByConversation = new Map(unreadGroups.map((g) => [g.conversationId, g._count._all]))

  return conversations.map((c) => {
    const other = c.participantAId === viewerUserId ? c.participantB : c.participantA
    const lastMessage = c.messages[0] ?? null
    return {
      id: c.id,
      other: toParticipantRef(other),
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

export async function getConversationForViewer(conversationId: string, viewerUserId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participantA: { select: participantSelect },
      participantB: { select: participantSelect },
    },
  })
  if (!conversation) throw new NotFoundError("Conversation not found")
  if (!isConversationParticipant(viewerUserId, conversation)) throw new ForbiddenError()

  const other = conversation.participantAId === viewerUserId ? conversation.participantB : conversation.participantA
  return { id: conversation.id, other: toParticipantRef(other) }
}

export async function listMessages(conversationId: string, viewerUserId: string, query: MessagesListQuery) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conversation) throw new NotFoundError("Conversation not found")
  if (!isConversationParticipant(viewerUserId, conversation)) throw new ForbiddenError()

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

export async function listMessageableUsers(viewerUserId: string) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { not: viewerUserId },
      OR: [{ employee: null }, { employee: { deletedAt: null, status: "ACTIVE" } }],
    },
    select: participantSelect,
  })

  return users.map(toParticipantRef).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getTotalUnreadCount(viewerUserId: string) {
  return prisma.message.count({
    where: {
      readAt: null,
      senderId: { not: viewerUserId },
      conversation: { OR: [{ participantAId: viewerUserId }, { participantBId: viewerUserId }] },
    },
  })
}
