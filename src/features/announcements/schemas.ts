import { z } from "zod"

export const announcementPriorityValues = ["LOW", "NORMAL", "HIGH", "URGENT"] as const

export const announcementFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required").max(5000),
  priority: z.enum(announcementPriorityValues),
  targetDepartmentId: z.string().optional(),
  isPinned: z.boolean(),
  expiresAt: z.string().optional(),
})
export type AnnouncementFormInput = z.infer<typeof announcementFormSchema>
