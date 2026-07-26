import { z } from "zod"

export const goalStatusValues = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const

export const goalFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.enum(goalStatusValues),
  progress: z
    .string()
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100, "Progress must be 0-100"),
})
export type GoalFormInput = z.infer<typeof goalFormSchema>

export const kpiFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  targetValue: z.string().refine((v) => !Number.isNaN(Number(v)), "Must be a number"),
  achievedValue: z.string().refine((v) => !Number.isNaN(Number(v)), "Must be a number"),
  unit: z.string().optional(),
  period: z.string().min(1, "Period is required").max(50),
})
export type KpiFormInput = z.infer<typeof kpiFormSchema>

export const reviewRatingSchema = z.object({
  criterion: z.string().min(1),
  rating: z.string().refine((v) => ["1", "2", "3", "4", "5"].includes(v), "Rating must be 1-5"),
  comment: z.string().optional(),
})

export const reviewFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  reviewPeriodStart: z.string().min(1, "Start date is required"),
  reviewPeriodEnd: z.string().min(1, "End date is required"),
  summary: z.string().optional(),
  ratings: z.array(reviewRatingSchema).min(1, "At least one rating is required"),
})
export type ReviewFormInput = z.infer<typeof reviewFormSchema>

export const reviewAcknowledgeSchema = z.object({
  comment: z.string().optional(),
})
export type ReviewAcknowledgeInput = z.infer<typeof reviewAcknowledgeSchema>

export const DEFAULT_REVIEW_CRITERIA = [
  "Quality of Work",
  "Productivity",
  "Communication",
  "Teamwork",
  "Initiative",
] as const
