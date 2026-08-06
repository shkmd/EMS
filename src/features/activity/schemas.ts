import { z } from "zod"

export const heartbeatSchema = z.object({
  state: z.enum(["active", "idle"]),
})
export type HeartbeatInput = z.infer<typeof heartbeatSchema>
