import { z } from "zod"

export const expenseCategoryValues = [
  "TRAVEL",
  "FOOD",
  "ACCOMMODATION",
  "OFFICE_SUPPLIES",
  "COMMUNICATION",
  "TRAINING",
  "OTHER",
] as const

export const expenseClaimFormSchema = z.object({
  category: z.enum(expenseCategoryValues),
  title: z.string().min(1, "Title is required").max(150),
  description: z.string().optional(),
  amount: z.string().min(1, "Amount is required").refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "Enter a valid amount"),
  expenseDate: z.string().min(1, "Expense date is required"),
})
export type ExpenseClaimFormInput = z.infer<typeof expenseClaimFormSchema>

export const expenseActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().optional(),
})
export type ExpenseActionInput = z.infer<typeof expenseActionSchema>

export const expenseListQuerySchema = z.object({
  status: z.enum(["PENDING", "MANAGER_APPROVED", "APPROVED", "REJECTED", "REIMBURSED", "CANCELLED"]).optional(),
  category: z.enum(expenseCategoryValues).optional(),
  employeeId: z.string().optional(),
  scope: z.enum(["mine", "team-pending", "hr-pending", "all"]).default("mine"),
})
export type ExpenseListQuery = z.infer<typeof expenseListQuerySchema>
