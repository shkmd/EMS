import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import { hashPassword, generateTemporaryPassword } from "@/lib/password"
import { sendMail, portalAccessGrantedEmailTemplate } from "@/lib/mail"
import { getEnv } from "@/config/env"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageUsers } from "@/features/users/authorization"
import type { CreateUserInput, UpdateUserInput } from "@/features/users/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageUsers(viewer.role)) throw new ForbiddenError()
}

export async function createUser(input: CreateUserInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  let email = input.email
  let employee: { id: string; email: string } | null = null

  if (input.employeeId) {
    const found = await prisma.employee.findUnique({
      where: { id: input.employeeId, deletedAt: null },
      select: { id: true, email: true, userId: true },
    })
    if (!found) throw new NotFoundError("Employee not found")
    if (found.userId) throw new ValidationError("This employee already has a linked account")
    employee = found
    email = found.email // server-derived, ignoring whatever the client sent, so the login email always matches the employee record
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)

  let user
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, password: passwordHash, role: input.role, mustChangePassword: true },
      })
      if (employee) {
        await tx.employee.update({ where: { id: employee.id }, data: { userId: created.id } })
      }
      return created
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("An account with this email already exists")
    }
    throw error
  }

  try {
    const loginUrl = `${getEnv().NEXT_PUBLIC_APP_URL}/login`
    await sendMail({ to: email, ...portalAccessGrantedEmailTemplate(loginUrl, email, temporaryPassword) })
  } catch (error) {
    console.error("Failed to send portal access email:", error)
  }

  await recordAuditLog({
    userId: viewer.sub,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    metadata: { role: input.role, employeeId: employee?.id ?? null },
    ...meta,
  })

  return { id: user.id, email: user.email, role: user.role, isActive: user.isActive }
}

export async function updateUser(id: string, input: UpdateUserInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  // Prevents a Super Admin from deactivating their own account or changing
  // their own role via this screen — either would risk locking themselves
  // out of Settings (and therefore this exact screen) with no way back in.
  if (id === viewer.sub) {
    throw new ValidationError("You can't change your own role or access from here")
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("User not found")

  const data: Prisma.UserUpdateInput = {}
  if (input.role !== undefined) data.role = input.role
  if (input.isActive !== undefined) data.isActive = input.isActive

  const updated = await prisma.user.update({ where: { id }, data })

  const action =
    input.isActive === false ? "USER_DEACTIVATED" : input.isActive === true ? "USER_REACTIVATED" : "USER_ROLE_UPDATED"

  await recordAuditLog({
    userId: viewer.sub,
    action,
    entityType: "User",
    entityId: id,
    metadata: input,
    ...meta,
  })

  return { id: updated.id, email: updated.email, role: updated.role, isActive: updated.isActive }
}
