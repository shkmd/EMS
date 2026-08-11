import { z } from "zod"

export const WEEKDAY_VALUES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const

export const FONT_FAMILY_VALUES = ["inter", "roboto", "poppins", "open-sans", "lato"] as const
export const FONT_FAMILY_LABELS: Record<(typeof FONT_FAMILY_VALUES)[number], string> = {
  inter: "Inter (default)",
  roboto: "Roboto",
  poppins: "Poppins",
  "open-sans": "Open Sans",
  lato: "Lato",
}

export const companySettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(150),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  timezone: z.string().min(1, "Timezone is required"),
  currency: z.string().min(1, "Currency is required").max(10),
  dateFormat: z.string().min(1, "Date format is required"),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #6366f1")
    .optional()
    .or(z.literal("")),
  fontFamily: z.enum(FONT_FAMILY_VALUES).optional(),
})
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>

export const workingHoursSettingsSchema = z.object({
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  workingDays: z.array(z.enum(WEEKDAY_VALUES)).min(1, "Select at least one working day"),
  graceMinutes: z.string().min(1, "Grace period is required"),
  halfDayHours: z.string().min(1, "Half-day hours is required"),
  fullDayHours: z.string().min(1, "Full-day hours is required"),
})
export type WorkingHoursSettingsInput = z.infer<typeof workingHoursSettingsSchema>

export const emailSettingsSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean(),
  fromName: z.string().optional(),
  fromEmail: z.string().optional(),
})
export type EmailSettingsInput = z.infer<typeof emailSettingsSchema>

export const systemSettingsSchema = z.object({
  sessionTimeoutMinutes: z.string().min(1, "Required"),
  passwordMinLength: z.string().min(1, "Required"),
  maxLoginAttempts: z.string().min(1, "Required"),
  lockoutDurationMinutes: z.string().min(1, "Required"),
  maintenanceMode: z.boolean(),
})
export type SystemSettingsInput = z.infer<typeof systemSettingsSchema>

export const leaveTypeFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10)
    .regex(/^[A-Z0-9_]+$/, "Code must be uppercase letters, numbers, or underscores"),
  defaultDaysPerYear: z.string().min(1, "Required"),
  isPaid: z.boolean(),
  carryForward: z.boolean(),
  maxCarryForwardDays: z.string().optional(),
})
export type LeaveTypeFormInput = z.infer<typeof leaveTypeFormSchema>
