import { z } from "zod"

export const assetCategoryValues = ["LAPTOP", "MONITOR", "MOBILE", "ID_CARD", "SIM", "VEHICLE", "OTHER"] as const
export const assetStatusValues = ["AVAILABLE", "ASSIGNED", "IN_REPAIR", "RETIRED"] as const

export const assetFormSchema = z.object({
  assetTag: z.string().min(1, "Asset tag is required").max(50),
  category: z.enum(assetCategoryValues),
  name: z.string().min(1, "Name is required").max(150),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.string().optional(),
  status: z.enum(assetStatusValues),
})
export type AssetFormInput = z.infer<typeof assetFormSchema>

export const assignAssetSchema = z.object({
  assetId: z.string().min(1, "Asset is required"),
  employeeId: z.string().min(1, "Employee is required"),
  issuedDate: z.string().min(1, "Issued date is required"),
  condition: z.string().optional(),
  remarks: z.string().optional(),
})
export type AssignAssetInput = z.infer<typeof assignAssetSchema>

export const assignmentStatusValues = ["RETURNED", "LOST", "DAMAGED"] as const

export const returnAssetSchema = z.object({
  returnDate: z.string().min(1, "Return date is required"),
  status: z.enum(assignmentStatusValues),
  condition: z.string().optional(),
  remarks: z.string().optional(),
})
export type ReturnAssetInput = z.infer<typeof returnAssetSchema>

export const assetListQuerySchema = z.object({
  category: z.enum(assetCategoryValues).optional(),
  status: z.enum(assetStatusValues).optional(),
  search: z.string().optional(),
})
export type AssetListQuery = z.infer<typeof assetListQuerySchema>
