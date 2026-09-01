import "server-only"

import { cache } from "react"

import { prisma } from "@/lib/prisma"

const DEFAULT_COMPANY_SETTINGS = {
  companyName: "My Company",
  logoUrl: null,
  letterheadImageUrl: null,
  signatureImageUrl: null,
  primaryColor: null,
  fontFamily: null,
  address: null,
  phone: null,
  email: null,
  website: null,
  timezone: "UTC",
  currency: "USD",
  dateFormat: "dd MMM yyyy",
}

// Cached per-request: the root layout, generateViewport, and the PWA
// manifest route all read this on every navigation — dedupes those into a
// single query instead of three.
export const getCompanySettings = cache(async () => {
  const settings = await prisma.companySettings.findUnique({ where: { id: 1 } })
  return settings ?? { id: 1, updatedAt: new Date(), ...DEFAULT_COMPANY_SETTINGS }
})

const DEFAULT_WORKING_HOURS_SETTINGS = {
  startTime: "09:00",
  endTime: "18:00",
  workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
  graceMinutes: 10,
  halfDayHours: 4,
  fullDayHours: 8,
}

export async function getWorkingHoursSettingsRow() {
  const settings = await prisma.workingHoursSettings.findUnique({ where: { id: 1 } })
  return settings ?? { id: 1, updatedAt: new Date(), ...DEFAULT_WORKING_HOURS_SETTINGS }
}

const DEFAULT_EMAIL_SETTINGS = {
  smtpHost: null,
  smtpPort: null,
  smtpUser: null,
  smtpPasswordEnc: null,
  smtpSecure: true,
  fromName: null,
  fromEmail: null,
}

/** Never returns the encrypted password itself — only whether one is set. */
export async function getEmailSettingsForDisplay() {
  const settings = await prisma.emailSettings.findUnique({ where: { id: 1 } })
  const { smtpPasswordEnc, ...rest } = settings ?? { id: 1, updatedAt: new Date(), ...DEFAULT_EMAIL_SETTINGS }
  return { ...rest, hasPassword: !!smtpPasswordEnc }
}

const DEFAULT_SYSTEM_SETTINGS = {
  sessionTimeoutMinutes: 60,
  passwordMinLength: 8,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  maintenanceMode: false,
}

export async function getSystemSettings() {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } })
  return settings ?? { id: 1, updatedAt: new Date(), ...DEFAULT_SYSTEM_SETTINGS }
}

export async function isMaintenanceModeEnabled() {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 1 }, select: { maintenanceMode: true } })
  return settings?.maintenanceMode ?? false
}
