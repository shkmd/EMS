import { z } from "zod"

const hoursString = z
  .string()
  .min(1, "Hours is required")
  .refine((v) => !Number.isNaN(Number(v)), "Must be a number")
  .refine((v) => Number(v) >= 0.5, "Minimum 0.5 hours")
  .refine((v) => Number(v) <= 4, "Use a half-day Leave request for more than 4 hours")

export const applyPermissionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  hours: hoursString,
  reason: z.string().min(1, "Reason is required").max(1000),
})
export type ApplyPermissionInput = z.infer<typeof applyPermissionSchema>

export const permissionRequestStatusValues = ["PENDING", "MANAGER_APPROVED", "APPROVED", "REJECTED", "CANCELLED"] as const

export const recordPermissionSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  hours: hoursString,
  reason: z.string().min(1, "Reason is required").max(1000),
  status: z.enum(permissionRequestStatusValues),
})
export type RecordPermissionInput = z.infer<typeof recordPermissionSchema>

export const permissionActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().optional(),
})
export type PermissionActionInput = z.infer<typeof permissionActionSchema>

export const permissionListQuerySchema = z.object({
  status: z.enum(permissionRequestStatusValues).optional(),
  employeeId: z.string().optional(),
  scope: z.enum(["mine", "team-pending", "hr-pending", "all"]).default("mine"),
})
export type PermissionListQuery = z.infer<typeof permissionListQuerySchema>
