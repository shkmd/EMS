import { z } from "zod"

export const billingCycleValues = ["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"] as const
export const subscriptionStatusValues = ["ACTIVE", "CANCELLED"] as const

export const subscriptionSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  vendor: z.string().max(150).optional(),
  category: z.string().max(100).optional(),
  cost: z.string().optional(),
  billingCycle: z.enum(billingCycleValues),
  startDate: z.string().optional(),
  endDate: z.string().min(1, "End date is required"),
  notifyEmployeeId: z.string().optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(subscriptionStatusValues),
})
export type SubscriptionInput = z.infer<typeof subscriptionSchema>
