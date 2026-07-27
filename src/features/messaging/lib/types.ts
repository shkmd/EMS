export type ParticipantRef = {
  id: string
  name: string
  profilePhotoUrl: string | null
  employeeId: string | null
}

export type ConversationSummary = {
  id: string
  other: ParticipantRef
  lastMessage: { body: string | null; attachmentName: string | null; senderId: string; createdAt: string } | null
  unreadCount: number
  updatedAt: string
}

export type MessageItem = {
  id: string
  conversationId: string
  senderId: string
  body: string | null
  attachmentUrl: string | null
  attachmentName: string | null
  attachmentType: string | null
  attachmentSize: number | null
  readAt: string | null
  createdAt: string
}
