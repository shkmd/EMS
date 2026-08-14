import { z } from "zod"

export const exitReasonValues = ["RESIGNATION", "TERMINATION", "RETIREMENT", "END_OF_CONTRACT", "OTHER"] as const

export const initiateOffboardingSchema = z.object({
  resignationDate: z.string().optional(),
  lastWorkingDay: z.string().min(1, "Last working day is required"),
  reason: z.enum(exitReasonValues),
  reasonNotes: z.string().max(1000).optional(),
})
export type InitiateOffboardingInput = z.infer<typeof initiateOffboardingSchema>

export const updateOffboardingChecklistSchema = z.object({
  duesCleared: z.boolean(),
  handoverComplete: z.boolean(),
  handoverNotes: z.string().max(2000).optional(),
})
export type UpdateOffboardingChecklistInput = z.infer<typeof updateOffboardingChecklistSchema>
