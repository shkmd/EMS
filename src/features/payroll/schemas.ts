import { z } from "zod"

const money = z
  .string()
  .min(1, "Required")
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Must be a non-negative number")

export const payslipFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  month: z.string().min(1, "Month is required"),
  year: z.string().min(1, "Year is required"),
  basic: money,
  hra: money,
  conveyanceAllowance: money,
  medicalAllowance: money,
  specialAllowance: money,
  otherAllowances: money,
  pf: money,
  esi: money,
  professionalTax: money,
  otherDeductions: money,
  remarks: z.string().optional(),
})
export type PayslipFormInput = z.infer<typeof payslipFormSchema>

export const payslipListQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  employeeId: z.string().optional(),
  status: z.enum(["DRAFT", "GENERATED", "PAID"]).optional(),
  departmentId: z.string().optional(),
})
export type PayslipListQuery = z.infer<typeof payslipListQuerySchema>
