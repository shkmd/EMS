import { z } from "zod"

export const startConversationSchema = z.object({
  employeeId: z.string().min(1, "Select an employee"),
})
export type StartConversationInput = z.infer<typeof startConversationSchema>

export const sendMessageSchema = z.object({
  body: z.string().max(4000).optional(),
})
export type SendMessageInput = z.infer<typeof sendMessageSchema>

export const messagesListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
})
export type MessagesListQuery = z.infer<typeof messagesListQuerySchema>
