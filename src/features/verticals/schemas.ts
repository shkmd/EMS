import { z } from "zod"

import { WEEKDAY_VALUES } from "@/features/settings/schemas"

export const verticalFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  workingDays: z.array(z.enum(WEEKDAY_VALUES)).min(1, "Select at least one working day"),
  graceMinutes: z.string().min(1, "Grace period is required"),
  halfDayHours: z.string().min(1, "Half-day hours is required"),
  fullDayHours: z.string().min(1, "Full-day hours is required"),
  managerIds: z.array(z.string()),
})
export type VerticalFormInput = z.infer<typeof verticalFormSchema>
