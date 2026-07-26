import { z } from "zod"

export const monthlyQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  employeeId: z.string().optional(),
})
export type MonthlyQuery = z.infer<typeof monthlyQuerySchema>

export const attendanceReportQuerySchema = z.object({
  dateFrom: z.string().min(1, "Start date is required"),
  dateTo: z.string().min(1, "End date is required"),
  departmentId: z.string().optional(),
  employeeId: z.string().optional(),
})
export type AttendanceReportQuery = z.infer<typeof attendanceReportQuerySchema>

export const attendanceStatusValues = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "LEAVE",
  "WORK_FROM_HOME",
  "HOLIDAY",
  "WEEK_OFF",
] as const

export const manualAttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(attendanceStatusValues),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  notes: z.string().optional(),
})
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>
