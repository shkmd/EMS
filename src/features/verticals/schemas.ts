import { z } from "zod"

import { WEEKDAY_VALUES } from "@/features/settings/schemas"

export const verticalFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    workingDays: z.array(z.enum(WEEKDAY_VALUES)).min(1, "Select at least one working day"),
    graceMinutes: z.string().min(1, "Grace period is required"),
    halfDayHours: z.string().min(1, "Half-day hours is required"),
    fullDayHours: z.string().min(1, "Full-day hours is required"),
    managerIds: z.array(z.string()),
    officeIpAllowlist: z.string().optional(),
    officeLat: z.string().optional(),
    officeLng: z.string().optional(),
    officeRadiusMeters: z.string().optional(),
  })
  .refine(
    (data) => {
      const filled = [data.officeLat, data.officeLng, data.officeRadiusMeters].filter((v) => v && v.trim() !== "")
      return filled.length === 0 || filled.length === 3
    },
    { message: "Set latitude, longitude, and radius together, or leave all three blank", path: ["officeRadiusMeters"] }
  )
  .refine((data) => !data.officeLat || (Number(data.officeLat) >= -90 && Number(data.officeLat) <= 90), {
    message: "Latitude must be between -90 and 90",
    path: ["officeLat"],
  })
  .refine((data) => !data.officeLng || (Number(data.officeLng) >= -180 && Number(data.officeLng) <= 180), {
    message: "Longitude must be between -180 and 180",
    path: ["officeLng"],
  })
  .refine((data) => !data.officeRadiusMeters || Number(data.officeRadiusMeters) > 0, {
    message: "Radius must be greater than 0",
    path: ["officeRadiusMeters"],
  })
export type VerticalFormInput = z.infer<typeof verticalFormSchema>
