import { z } from "zod"

export const startConversationSchema = z.object({
  userId: z.string().min(1, "Select someone to message"),
})
export type StartConversationInput = z.infer<typeof startConversationSchema>

export const createGroupConversationSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100),
  userIds: z.array(z.string()).min(2, "Pick at least 2 other people"),
})
export type CreateGroupConversationInput = z.infer<typeof createGroupConversationSchema>

export const sendMessageSchema = z.object({
  body: z.string().max(4000).optional(),
})
export type SendMessageInput = z.infer<typeof sendMessageSchema>

export const callSignalSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("invite"), callId: z.string().min(1), withVideo: z.boolean() }),
  z.object({ kind: z.literal("accept"), callId: z.string().min(1) }),
  z.object({ kind: z.literal("decline"), callId: z.string().min(1) }),
  z.object({ kind: z.literal("end"), callId: z.string().min(1) }),
  z.object({ kind: z.literal("offer"), callId: z.string().min(1), toUserId: z.string().min(1), sdp: z.unknown() }),
  z.object({ kind: z.literal("answer"), callId: z.string().min(1), toUserId: z.string().min(1), sdp: z.unknown() }),
  z.object({
    kind: z.literal("ice-candidate"),
    callId: z.string().min(1),
    toUserId: z.string().min(1),
    candidate: z.unknown(),
  }),
])
export type CallSignalInput = z.infer<typeof callSignalSchema>

export const messagesListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
})
export type MessagesListQuery = z.infer<typeof messagesListQuerySchema>
