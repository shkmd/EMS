export function isConversationParticipant(
  viewerEmployeeId: string,
  conversation: { participantAId: string; participantBId: string }
) {
  return viewerEmployeeId === conversation.participantAId || viewerEmployeeId === conversation.participantBId
}
