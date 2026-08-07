import { z } from "zod"

export const dailyLogSchema = z.object({
  note: z.string().min(1, "Write something before saving").max(4000),
})
export type DailyLogInput = z.infer<typeof dailyLogSchema>
