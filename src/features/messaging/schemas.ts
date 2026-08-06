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

export const messagesListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
})
export type MessagesListQuery = z.infer<typeof messagesListQuerySchema>
