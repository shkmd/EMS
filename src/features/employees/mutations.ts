import "server-only"

import { Prisma, type Gender, type BloodGroup, type MaritalStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ConflictError, NotFoundError, ForbiddenError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import { saveUploadedFile, deleteUploadedFile, assertAllowedFile, ALLOWED_DOCUMENT_MIME_TYPES, ALLOWED_PHOTO_MIME_TYPES } from "@/lib/storage"
import { hashPassword, generateTemporaryPassword } from "@/lib/password"
import { sendMail, portalAccessGrantedEmailTemplate } from "@/lib/mail"
import { getEnv } from "@/config/env"
import type { AccessTokenPayload } from "@/lib/jwt"
import { generateNextEmployeeCode } from "@/features/employees/lib/generate-employee-code"
import { assertCanManageEmployees } from "@/features/employees/queries"
import { canAccessEmployee } from "@/features/employees/authorization"
import type { EmployeeFormInput, EmployeeNoteInput, EmployeeStatusInput, AccountAccessInput } from "@/features/employees/schemas"
import type { DocumentType } from "@prisma/client"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

const orNull = (v?: string) => (v && v.trim() !== "" ? v : null)
const orNullNumber = (v?: string) => (v && v.trim() !== "" ? Number(v) : null)

function toEmployeeData(input: EmployeeFormInput) {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    gender: orNull(input.gender) as Gender | null,
    dob: input.dob ? new Date(input.dob) : null,
    bloodGroup: orNull(input.bloodGroup) as BloodGroup | null,
    maritalStatus: orNull(input.maritalStatus) as MaritalStatus | null,
    mobile: input.mobile,
    alternateMobile: orNull(input.alternateMobile),
    email: input.email,
    personalEmail: orNull(input.personalEmail),
    currentAddress: orNull(input.currentAddress),
    permanentAddress: orNull(input.permanentAddress),
    city: orNull(input.city),
    state: orNull(input.state),
    country: orNull(input.country),
    pincode: orNull(input.pincode),
    departmentId: orNull(input.departmentId),
    designationId: orNull(input.designationId),
    verticalId: orNull(input.verticalId),
    reportingManagerId: orNull(input.reportingManagerId),
    employmentType: input.employmentType,
    dateOfJoining: new Date(input.dateOfJoining),
    probationPeriodMonths: orNullNumber(input.probationPeriodMonths),
    confirmationDate: input.confirmationDate ? new Date(input.confirmationDate) : null,
    workLocation: orNull(input.workLocation),
    shift: orNull(input.shift),
    status: input.status,
    basicSalary: orNullNumber(input.basicSalary),
    allowances: orNullNumber(input.allowances),
    bankName: orNull(input.bankName),
    bankAccountNo: orNull(input.bankAccountNo),
    bankIfsc: orNull(input.bankIfsc),
    pan: orNull(input.pan),
    aadhaar: orNull(input.aadhaar),
    pfNumber: orNull(input.pfNumber),
    esiNumber: orNull(input.esiNumber),
    emergencyContactName: orNull(input.emergencyContactName),
    emergencyContactRelationship: orNull(input.emergencyContactRelationship),
    emergencyContactPhone: orNull(input.emergencyContactPhone),
  } satisfies Prisma.EmployeeUncheckedUpdateInput
}

export async function createEmployee(input: EmployeeFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManageEmployees(viewer)

  try {
    const employee = await prisma.$transaction(async (tx) => {
      const employeeCode = await generateNextEmployeeCode()
      const created = await tx.employee.create({
        data: { employeeCode, ...toEmployeeData(input) },
      })
      await tx.employeeTimelineEvent.create({
        data: {
          employeeId: created.id,
          type: "JOINED",
          title: `Joined as ${input.employmentType.replace("_", " ").toLowerCase()}`,
          eventDate: created.dateOfJoining,
        },
      })

      // Seed this year's leave balances up front so they're visible
      // immediately, rather than lazily created on first leave application.
      const leaveTypes = await tx.leaveType.findMany()
      if (leaveTypes.length > 0) {
        await tx.leaveBalance.createMany({
          data: leaveTypes.map((lt) => ({
            employeeId: created.id,
            leaveTypeId: lt.id,
            year: new Date().getFullYear(),
            allocated: lt.defaultDaysPerYear,
            used: 0,
          })),
          skipDuplicates: true,
        })
      }

      return created
    })

    await recordAuditLog({
      userId: viewer.sub,
      action: "EMPLOYEE_CREATED",
      entityType: "Employee",
      entityId: employee.id,
      ...meta,
    })

    return employee
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("An employee with this work email already exists")
    }
    throw error
  }
}

export async function updateEmployee(id: string, input: EmployeeFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManageEmployees(viewer)

  const existing = await prisma.employee.findUnique({ where: { id, deletedAt: null } })
  if (!existing) throw new NotFoundError("Employee not found")

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.employee.update({ where: { id }, data: toEmployeeData(input) })

      if (existing.status !== input.status) {
        await tx.employeeTimelineEvent.create({
          data: {
            employeeId: id,
            type: "STATUS_CHANGE",
            title: `Status changed from ${existing.status} to ${input.status}`,
            eventDate: new Date(),
          },
        })
      }
      if (existing.departmentId !== (input.departmentId ?? null)) {
        await tx.employeeTimelineEvent.create({
          data: { employeeId: id, type: "TRANSFER", title: "Department updated", eventDate: new Date() },
        })
      }

      return result
    })

    await recordAuditLog({
      userId: viewer.sub,
      action: "EMPLOYEE_UPDATED",
      entityType: "Employee",
      entityId: id,
      ...meta,
    })

    return updated
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("An employee with this work email already exists")
    }
    throw error
  }
}

export async function updateEmployeeStatus(id: string, status: EmployeeStatusInput["status"], viewer: AccessTokenPayload, meta: Meta) {
  assertCanManageEmployees(viewer)

  const existing = await prisma.employee.findUnique({ where: { id, deletedAt: null } })
  if (!existing) throw new NotFoundError("Employee not found")

  if (existing.status === status) return existing

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.employee.update({ where: { id }, data: { status } })
    await tx.employeeTimelineEvent.create({
      data: {
        employeeId: id,
        type: "STATUS_CHANGE",
        title: `Status changed from ${existing.status} to ${status}`,
        eventDate: new Date(),
      },
    })
    return result
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "EMPLOYEE_STATUS_CHANGED",
    entityType: "Employee",
    entityId: id,
    metadata: { from: existing.status, to: status },
    ...meta,
  })

  return updated
}

export async function updateEmployeeAccountAccess(
  id: string,
  input: AccountAccessInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  assertCanManageEmployees(viewer)

  const employee = await prisma.employee.findUnique({ where: { id, deletedAt: null }, include: { user: true } })
  if (!employee) throw new NotFoundError("Employee not found")

  // Only a SUPER_ADMIN can grant (or leave someone at) the SUPER_ADMIN role —
  // otherwise HR, who can already reach this action, could mint new super
  // admins via an employee profile.
  if (input.enabled && input.role === "SUPER_ADMIN" && viewer.role !== "SUPER_ADMIN") {
    throw new ForbiddenError()
  }

  if (!input.enabled) {
    if (!employee.userId) return { hasAccess: false as const }
    await prisma.user.update({ where: { id: employee.userId }, data: { isActive: false } })
    await recordAuditLog({
      userId: viewer.sub,
      action: "EMPLOYEE_PORTAL_ACCESS_REVOKED",
      entityType: "Employee",
      entityId: id,
      ...meta,
    })
    return { hasAccess: false as const }
  }

  const role = input.role!

  if (employee.userId) {
    await prisma.user.update({ where: { id: employee.userId }, data: { role, isActive: true } })
    await recordAuditLog({
      userId: viewer.sub,
      action: "EMPLOYEE_PORTAL_ROLE_UPDATED",
      entityType: "Employee",
      entityId: id,
      metadata: { role },
      ...meta,
    })
    return { hasAccess: true as const, isNew: false }
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: employee.email, password: passwordHash, role, mustChangePassword: true },
      })
      await tx.employee.update({ where: { id }, data: { userId: user.id } })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("An account with this email already exists")
    }
    throw error
  }

  try {
    const loginUrl = `${getEnv().NEXT_PUBLIC_APP_URL}/login`
    await sendMail({ to: employee.email, ...portalAccessGrantedEmailTemplate(loginUrl, employee.email, temporaryPassword) })
  } catch (error) {
    console.error("Failed to send portal access email:", error)
  }

  await recordAuditLog({
    userId: viewer.sub,
    action: "EMPLOYEE_PORTAL_ACCESS_GRANTED",
    entityType: "Employee",
    entityId: id,
    metadata: { role },
    ...meta,
  })

  return { hasAccess: true as const, isNew: true }
}

export async function softDeleteEmployee(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManageEmployees(viewer)

  const existing = await prisma.employee.findUnique({ where: { id, deletedAt: null } })
  if (!existing) throw new NotFoundError("Employee not found")

  await prisma.$transaction(async (tx) => {
    await tx.employee.update({ where: { id }, data: { deletedAt: new Date(), status: "TERMINATED" } })
    // A departed employee's portal login must not keep working — otherwise
    // removing them here would silently leave their account able to log in.
    if (existing.userId) {
      await tx.user.update({ where: { id: existing.userId }, data: { isActive: false } })
    }
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "EMPLOYEE_DELETED",
    entityType: "Employee",
    entityId: id,
    ...meta,
  })
}

export async function addEmployeeNote(
  employeeId: string,
  input: EmployeeNoteInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId, deletedAt: null } })
  if (!employee) throw new NotFoundError("Employee not found")
  if (!canAccessEmployee(viewer, employee)) throw new ForbiddenError()

  const note = await prisma.employeeNote.create({
    data: { employeeId, authorId: viewer.sub, note: input.note },
    include: { author: { select: { id: true, email: true } } },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "EMPLOYEE_NOTE_ADDED",
    entityType: "Employee",
    entityId: employeeId,
    ...meta,
  })

  return note
}

export async function uploadEmployeeDocument(
  employeeId: string,
  file: File,
  type: DocumentType,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  assertCanManageEmployees(viewer)

  const employee = await prisma.employee.findUnique({ where: { id: employeeId, deletedAt: null } })
  if (!employee) throw new NotFoundError("Employee not found")

  assertAllowedFile(file, ALLOWED_DOCUMENT_MIME_TYPES)
  const buffer = Buffer.from(await file.arrayBuffer())
  const { relativePath } = await saveUploadedFile(buffer, `employees/${employeeId}/documents`, file.name)

  const document = await prisma.employeeDocument.create({
    data: {
      employeeId,
      type,
      fileName: file.name,
      fileUrl: relativePath,
      fileSize: file.size,
      mimeType: file.type,
    },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "EMPLOYEE_DOCUMENT_UPLOADED",
    entityType: "Employee",
    entityId: employeeId,
    metadata: { documentId: document.id, type },
    ...meta,
  })

  return document
}

export async function deleteEmployeeDocument(
  employeeId: string,
  documentId: string,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  assertCanManageEmployees(viewer)

  const document = await prisma.employeeDocument.findUnique({ where: { id: documentId } })
  if (!document || document.employeeId !== employeeId) throw new NotFoundError("Document not found")

  await prisma.employeeDocument.delete({ where: { id: documentId } })
  await deleteUploadedFile(document.fileUrl)

  await recordAuditLog({
    userId: viewer.sub,
    action: "EMPLOYEE_DOCUMENT_DELETED",
    entityType: "Employee",
    entityId: employeeId,
    metadata: { documentId },
    ...meta,
  })
}

export async function getEmployeeDocumentForDownload(
  employeeId: string,
  documentId: string,
  viewer: AccessTokenPayload
) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId, deletedAt: null } })
  if (!employee) throw new NotFoundError("Employee not found")
  if (!canAccessEmployee(viewer, employee)) throw new ForbiddenError()

  const document = await prisma.employeeDocument.findUnique({ where: { id: documentId } })
  if (!document || document.employeeId !== employeeId) throw new NotFoundError("Document not found")

  return document
}

export async function uploadEmployeePhoto(employeeId: string, file: File, viewer: AccessTokenPayload, meta: Meta) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId, deletedAt: null } })
  if (!employee) throw new NotFoundError("Employee not found")
  if (!canManageEmployeesOrSelf(viewer, employee)) throw new ForbiddenError()

  assertAllowedFile(file, ALLOWED_PHOTO_MIME_TYPES)
  const buffer = Buffer.from(await file.arrayBuffer())
  const { relativePath } = await saveUploadedFile(buffer, `employees/${employeeId}/photo`, file.name)

  if (employee.profilePhotoUrl) {
    await deleteUploadedFile(employee.profilePhotoUrl)
  }

  await prisma.employee.update({ where: { id: employeeId }, data: { profilePhotoUrl: relativePath } })

  await recordAuditLog({
    userId: viewer.sub,
    action: "EMPLOYEE_PHOTO_UPDATED",
    entityType: "Employee",
    entityId: employeeId,
    ...meta,
  })

  return relativePath
}

function canManageEmployeesOrSelf(viewer: AccessTokenPayload, employee: { id: string }) {
  if (viewer.role === "SUPER_ADMIN" || viewer.role === "HR") return true
  return viewer.employeeId === employee.id
}
