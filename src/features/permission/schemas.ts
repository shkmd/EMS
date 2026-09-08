import { z } from "zod"

import { hoursBetween } from "@/features/permission/lib/time"

function checkTimeRange(data: { fromTime: string; toTime: string }, ctx: z.RefinementCtx) {
  const hours = hoursBetween(data.fromTime, data.toTime)
  if (hours === null) {
    ctx.addIssue({ code: "custom", message: "End time must be after start time", path: ["toTime"] })
    return
  }
  if (hours < 0.5) {
    ctx.addIssue({ code: "custom", message: "Minimum 0.5 hours", path: ["toTime"] })
  }
  if (hours > 4) {
    ctx.addIssue({ code: "custom", message: "Use a half-day Leave request for more than 4 hours", path: ["toTime"] })
  }
}

export const applyPermissionSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    fromTime: z.string().min(1, "Start time is required"),
    toTime: z.string().min(1, "End time is required"),
    reason: z.string().min(1, "Reason is required").max(1000),
  })
  .superRefine(checkTimeRange)
export type ApplyPermissionInput = z.infer<typeof applyPermissionSchema>

export const permissionRequestStatusValues = ["PENDING", "MANAGER_APPROVED", "APPROVED", "REJECTED", "CANCELLED"] as const

export const recordPermissionSchema = z
  .object({
    employeeId: z.string().min(1, "Employee is required"),
    date: z.string().min(1, "Date is required"),
    fromTime: z.string().min(1, "Start time is required"),
    toTime: z.string().min(1, "End time is required"),
    reason: z.string().min(1, "Reason is required").max(1000),
    status: z.enum(permissionRequestStatusValues),
  })
  .superRefine(checkTimeRange)
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
