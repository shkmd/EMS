export function isConversationParticipant(
  viewerUserId: string,
  conversation: { participantAId: string; participantBId: string }
) {
  return viewerUserId === conversation.participantAId || viewerUserId === conversation.participantBId
}
