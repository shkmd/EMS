import "server-only"

import { Prisma } from "@prisma/client"

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
    where: { participants: { some: { userId: viewerUserId } } },
    include: {
      participants: { include: { user: { select: participantSelect } } },
      messages: { take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const conversationIds = conversations.map((c) => c.id)

  // Unread count per conversation: messages not sent by the viewer, created
  // after the viewer's own lastReadAt for that conversation (each
  // conversation can have a different cutoff for the same viewer, which
  // rules out a plain groupBy — needs a join against the per-row cutoff).
  const unreadRows =
    conversationIds.length > 0
      ? await prisma.$queryRaw<{ conversationId: string; count: bigint }[]>(
          Prisma.sql`
            SELECT m.conversationId as conversationId, COUNT(*) as count
            FROM messages m
            JOIN conversation_participants cp ON cp.conversationId = m.conversationId AND cp.userId = ${viewerUserId}
            WHERE m.conversationId IN (${Prisma.join(conversationIds)})
              AND m.senderId != ${viewerUserId}
              AND (cp.lastReadAt IS NULL OR m.createdAt > cp.lastReadAt)
            GROUP BY m.conversationId
          `
        )
      : []
  const unreadByConversation = new Map(unreadRows.map((r) => [r.conversationId, Number(r.count)]))

  return conversations.map((c) => {
    const participants = c.participants.filter((p) => p.userId !== viewerUserId).map((p) => toParticipantRef(p.user))
    const lastMessage = c.messages[0] ?? null
    return {
      id: c.id,
      isGroup: c.isGroup,
      name: c.name,
      participants,
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
    include: { participants: { include: { user: { select: participantSelect } } } },
  })
  if (!conversation) throw new NotFoundError("Conversation not found")
  if (!isConversationParticipant(viewerUserId, conversation)) throw new ForbiddenError()

  const participants = conversation.participants.filter((p) => p.userId !== viewerUserId).map((p) => toParticipantRef(p.user))
  return { id: conversation.id, isGroup: conversation.isGroup, name: conversation.name, participants }
}

export async function listMessages(conversationId: string, viewerUserId: string, query: MessagesListQuery) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { select: { userId: true } } },
  })
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
  const result = await prisma.$queryRaw<{ count: bigint }[]>(
    Prisma.sql`
      SELECT COUNT(*) as count
      FROM messages m
      JOIN conversation_participants cp ON cp.conversationId = m.conversationId AND cp.userId = ${viewerUserId}
      WHERE m.senderId != ${viewerUserId}
        AND (cp.lastReadAt IS NULL OR m.createdAt > cp.lastReadAt)
    `
  )
  return Number(result[0]?.count ?? 0)
}
