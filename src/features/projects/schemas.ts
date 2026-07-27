import { z } from "zod"

export const projectStatusValues = ["ACTIVE", "ARCHIVED"] as const

export const projectFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
})
export type ProjectFormInput = z.infer<typeof projectFormSchema>

export const projectStatusUpdateSchema = z.object({
  status: z.enum(projectStatusValues),
})
export type ProjectStatusUpdateInput = z.infer<typeof projectStatusUpdateSchema>

export const taskStatusValues = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const
export const taskPriorityValues = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const

export const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  status: z.enum(taskStatusValues),
  priority: z.enum(taskPriorityValues),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  assigneeIds: z.array(z.string()),
})
export type TaskFormInput = z.infer<typeof taskFormSchema>

export const taskStatusUpdateSchema = z.object({
  status: z.enum(taskStatusValues),
})
export type TaskStatusUpdateInput = z.infer<typeof taskStatusUpdateSchema>

// Manager-only Board (drag-and-drop) reordering: replaces the ordering (and,
// for cross-column drops, the status) of every task in one destination column.
export const reorderTasksSchema = z.object({
  status: z.enum(taskStatusValues),
  orderedTaskIds: z.array(z.string()).min(1),
})
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>
