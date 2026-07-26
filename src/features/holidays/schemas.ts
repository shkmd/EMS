import { z } from "zod"

export const holidayTypeValues = ["PUBLIC", "COMPANY", "OPTIONAL"] as const

export const holidayFormSchema = z.object({
  name: z.string().min(1, "Holiday name is required").max(150),
  date: z.string().min(1, "Date is required"),
  type: z.enum(holidayTypeValues),
  description: z.string().optional(),
})
export type HolidayFormInput = z.infer<typeof holidayFormSchema>
