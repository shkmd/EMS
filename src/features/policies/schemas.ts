import { z } from "zod"

const optionalString = z.string().optional()

export const policyFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  category: optionalString,
  content: optionalString,
  version: optionalString,
  effectiveDate: optionalString,
  isPublished: z.boolean(),
  requiresAcknowledgment: z.boolean(),
})
export type PolicyFormInput = z.infer<typeof policyFormSchema>
