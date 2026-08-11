import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageSettings } from "@/features/settings/authorization"
import { encryptSecret } from "@/features/settings/lib/crypto"
import { saveUploadedFile, deleteUploadedFile, assertAllowedFile, ALLOWED_PHOTO_MIME_TYPES } from "@/lib/storage"
import type {
  CompanySettingsInput,
  WorkingHoursSettingsInput,
  EmailSettingsInput,
  SystemSettingsInput,
  LeaveTypeFormInput,
} from "@/features/settings/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageSettings(viewer.role)) throw new ForbiddenError()
}

function optionalStr(value: string | undefined) {
  return value && value.trim() !== "" ? value : null
}

export async function updateCompanySettings(input: CompanySettingsInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const data = {
    companyName: input.companyName,
    address: optionalStr(input.address),
    phone: optionalStr(input.phone),
    email: optionalStr(input.email),
    website: optionalStr(input.website),
    timezone: input.timezone,
    currency: input.currency,
    dateFormat: input.dateFormat,
    primaryColor: optionalStr(input.primaryColor),
    fontFamily: optionalStr(input.fontFamily),
  }

  const settings = await prisma.companySettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } })
  await recordAuditLog({ userId: viewer.sub, action: "SETTINGS_COMPANY_UPDATED", entityType: "CompanySettings", entityId: "1", ...meta })
  return settings
}

export async function uploadCompanyLogo(file: File, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  assertAllowedFile(file, ALLOWED_PHOTO_MIME_TYPES)
  const buffer = Buffer.from(await file.arrayBuffer())
  const { relativePath } = await saveUploadedFile(buffer, "company/logo", file.name)

  const existing = await prisma.companySettings.findUnique({ where: { id: 1 }, select: { logoUrl: true } })
  if (existing?.logoUrl) {
    await deleteUploadedFile(existing.logoUrl)
  }

  const settings = await prisma.companySettings.upsert({
    where: { id: 1 },
    update: { logoUrl: relativePath },
    create: { id: 1, logoUrl: relativePath },
  })

  await recordAuditLog({ userId: viewer.sub, action: "SETTINGS_LOGO_UPDATED", entityType: "CompanySettings", entityId: "1", ...meta })
  return settings
}

export async function updateWorkingHoursSettings(input: WorkingHoursSettingsInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const data = {
    startTime: input.startTime,
    endTime: input.endTime,
    workingDays: input.workingDays,
    graceMinutes: Number(input.graceMinutes),
    halfDayHours: Number(input.halfDayHours),
    fullDayHours: Number(input.fullDayHours),
  }

  const settings = await prisma.workingHoursSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } })
  await recordAuditLog({
    userId: viewer.sub,
    action: "SETTINGS_WORKING_HOURS_UPDATED",
    entityType: "WorkingHoursSettings",
    entityId: "1",
    ...meta,
  })
  return settings
}

export async function updateEmailSettings(input: EmailSettingsInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const data: Prisma.EmailSettingsUncheckedCreateInput = {
    id: 1,
    smtpHost: optionalStr(input.smtpHost),
    smtpPort: input.smtpPort && input.smtpPort.trim() !== "" ? Number(input.smtpPort) : null,
    smtpUser: optionalStr(input.smtpUser),
    smtpSecure: input.smtpSecure,
    fromName: optionalStr(input.fromName),
    fromEmail: optionalStr(input.fromEmail),
  }
  // Only touch the stored password when the admin actually typed a new one —
  // the form never receives the decrypted value back, so an empty field
  // must mean "leave it as-is", not "clear it".
  if (input.smtpPassword && input.smtpPassword.trim() !== "") {
    data.smtpPasswordEnc = encryptSecret(input.smtpPassword)
  }

  const settings = await prisma.emailSettings.upsert({ where: { id: 1 }, update: data, create: data })
  await recordAuditLog({ userId: viewer.sub, action: "SETTINGS_EMAIL_UPDATED", entityType: "EmailSettings", entityId: "1", ...meta })
  const { smtpPasswordEnc, ...rest } = settings
  return { ...rest, hasPassword: !!smtpPasswordEnc }
}

export async function updateSystemSettings(input: SystemSettingsInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const data = {
    sessionTimeoutMinutes: Number(input.sessionTimeoutMinutes),
    passwordMinLength: Number(input.passwordMinLength),
    maxLoginAttempts: Number(input.maxLoginAttempts),
    lockoutDurationMinutes: Number(input.lockoutDurationMinutes),
    maintenanceMode: input.maintenanceMode,
  }

  const settings = await prisma.systemSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } })
  await recordAuditLog({ userId: viewer.sub, action: "SETTINGS_SYSTEM_UPDATED", entityType: "SystemSettings", entityId: "1", ...meta })
  return settings
}

function toLeaveTypeData(input: LeaveTypeFormInput) {
  return {
    name: input.name,
    code: input.code,
    defaultDaysPerYear: Number(input.defaultDaysPerYear),
    isPaid: input.isPaid,
    carryForward: input.carryForward,
    maxCarryForwardDays:
      input.carryForward && input.maxCarryForwardDays && input.maxCarryForwardDays.trim() !== ""
        ? Number(input.maxCarryForwardDays)
        : null,
  }
}

export async function createLeaveType(input: LeaveTypeFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  try {
    const leaveType = await prisma.leaveType.create({ data: toLeaveTypeData(input) })
    await recordAuditLog({ userId: viewer.sub, action: "LEAVE_TYPE_CREATED", entityType: "LeaveType", entityId: leaveType.id, ...meta })
    return leaveType
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("A leave type with this name or code already exists")
    }
    throw error
  }
}

export async function updateLeaveType(id: string, input: LeaveTypeFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.leaveType.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Leave type not found")

  const data = toLeaveTypeData(input)

  try {
    const leaveType = await prisma.$transaction(async (tx) => {
      const updated = await tx.leaveType.update({ where: { id }, data })

      // LeaveBalance.allocated is only ever seeded once, at employee-
      // creation time, from whatever defaultDaysPerYear was then — it's
      // never re-read after that. Without this, changing a leave type's
      // yearly allocation here would silently only apply to brand-new
      // employees, leaving everyone else frozen at the old number. There's
      // no per-employee custom-allocation feature to accidentally clobber,
      // so it's safe to keep this year's already-seeded balances in sync.
      if (existing.defaultDaysPerYear !== data.defaultDaysPerYear) {
        await tx.leaveBalance.updateMany({
          where: { leaveTypeId: id, year: new Date().getFullYear() },
          data: { allocated: data.defaultDaysPerYear },
        })
      }

      return updated
    })

    await recordAuditLog({ userId: viewer.sub, action: "LEAVE_TYPE_UPDATED", entityType: "LeaveType", entityId: id, ...meta })
    return leaveType
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("A leave type with this name or code already exists")
    }
    throw error
  }
}

export async function deleteLeaveType(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.leaveType.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Leave type not found")

  const usageCount = await prisma.leaveRequest.count({ where: { leaveTypeId: id } })
  if (usageCount > 0) {
    throw new ValidationError("This leave type has existing leave requests and can't be deleted")
  }

  await prisma.leaveBalance.deleteMany({ where: { leaveTypeId: id } })
  await prisma.leaveType.delete({ where: { id } })

  await recordAuditLog({ userId: viewer.sub, action: "LEAVE_TYPE_DELETED", entityType: "LeaveType", entityId: id, ...meta })
}
