import { z } from "zod"

export const leaveDurationValues = ["FULL_DAY", "FIRST_HALF", "SECOND_HALF"] as const

export const applyLeaveSchema = z
  .object({
    leaveTypeId: z.string().min(1, "Leave type is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    duration: z.enum(leaveDurationValues),
    reason: z.string().min(1, "Reason is required").max(1000),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  })
  .refine((data) => data.duration === "FULL_DAY" || data.startDate === data.endDate, {
    message: "Half-day leave must be a single day",
    path: ["duration"],
  })
export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>

export const leaveActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().optional(),
})
export type LeaveActionInput = z.infer<typeof leaveActionSchema>

export const leaveListQuerySchema = z.object({
  status: z.enum(["PENDING", "MANAGER_APPROVED", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
  employeeId: z.string().optional(),
  scope: z.enum(["mine", "team-pending", "hr-pending", "all"]).default("mine"),
})
export type LeaveListQuery = z.infer<typeof leaveListQuerySchema>

export const leaveCalendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})
export type LeaveCalendarQuery = z.infer<typeof leaveCalendarQuerySchema>
