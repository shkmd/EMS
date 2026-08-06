export function isConversationParticipant(
  viewerUserId: string,
  conversation: { participants: { userId: string }[] }
) {
  return conversation.participants.some((p) => p.userId === viewerUserId)
}
