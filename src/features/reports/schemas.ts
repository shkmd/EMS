import { z } from "zod"

import { assetCategoryValues, assetStatusValues } from "@/features/assets/schemas"

export const leaveReportQuerySchema = z.object({
  dateFrom: z.string().min(1, "Start date is required"),
  dateTo: z.string().min(1, "End date is required"),
  departmentId: z.string().optional(),
  leaveTypeId: z.string().optional(),
  status: z.enum(["PENDING", "MANAGER_APPROVED", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
})
export type LeaveReportQuery = z.infer<typeof leaveReportQuerySchema>

export const assetReportQuerySchema = z.object({
  category: z.enum(assetCategoryValues).optional(),
  status: z.enum(assetStatusValues).optional(),
})
export type AssetReportQuery = z.infer<typeof assetReportQuerySchema>
