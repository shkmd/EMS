import { z } from "zod"

export const updateOnboardingChecklistSchema = z.object({
  documentsCollected: z.boolean(),
  documentsNotes: z.string().max(2000).optional(),
  orientationComplete: z.boolean(),
  orientationNotes: z.string().max(2000).optional(),
})
export type UpdateOnboardingChecklistInput = z.infer<typeof updateOnboardingChecklistSchema>
