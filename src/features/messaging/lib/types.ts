export type ParticipantRef = {
  id: string
  name: string
  profilePhotoUrl: string | null
  employeeId: string | null
}

export type ConversationSummary = {
  id: string
  isGroup: boolean
  name: string | null
  // Everyone in the conversation except the viewer — a single entry for a
  // 1:1 conversation, two or more for a group.
  participants: ParticipantRef[]
  lastMessage: { body: string | null; attachmentName: string | null; senderId: string; createdAt: string } | null
  unreadCount: number
  updatedAt: string
}

export type ConversationDetail = {
  id: string
  isGroup: boolean
  name: string | null
  participants: ParticipantRef[]
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
  createdAt: string
}
