import { z } from "zod"

export const dailyLogSchema = z.object({
  note: z.string().min(1, "Write something before saving").max(4000),
})
export type DailyLogInput = z.infer<typeof dailyLogSchema>

export const dailyTaskReportQuerySchema = z.object({
  dateFrom: z.string().min(1, "Start date is required"),
  dateTo: z.string().min(1, "End date is required"),
  departmentId: z.string().optional(),
  employeeId: z.string().optional(),
})
export type DailyTaskReportQuery = z.infer<typeof dailyTaskReportQuerySchema>
