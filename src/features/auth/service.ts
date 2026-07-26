import "server-only"

import { prisma } from "@/lib/prisma"
import { getEnv } from "@/config/env"
import { signAccessToken } from "@/lib/jwt"
import { hashPassword, verifyPassword, hashToken, generateOpaqueToken } from "@/lib/password"
import { parseDurationMs } from "@/lib/duration"
import { sendMail, passwordResetEmailTemplate } from "@/lib/mail"
import { recordAuditLog } from "@/lib/audit"
import { UnauthorizedError, ValidationError } from "@/lib/errors"
import { PASSWORD_RESET_TOKEN_TTL_MS } from "@/features/auth/constants"
import type { LoginInput, ResetPasswordInput, ChangePasswordInput } from "@/features/auth/schemas"

type RequestMeta = {
  ipAddress?: string | null
  userAgent?: string | null
}

async function issueTokenPair(userId: string, role: string, employeeId: string | null, meta: RequestMeta) {
  const env = getEnv()

  const accessToken = await signAccessToken({
    sub: userId,
    role: role as never,
    employeeId,
  })

  const refreshToken = generateOpaqueToken()
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN)),
      createdByIp: meta.ipAddress ?? undefined,
    },
  })

  return { accessToken, refreshToken }
}

export async function login(input: LoginInput, meta: RequestMeta) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { employee: { select: { id: true } } },
  })

  const invalidCredentialsError = new UnauthorizedError("Invalid email or password")

  if (!user || !user.isActive) {
    await recordAuditLog({
      action: "LOGIN_FAILED",
      entityType: "User",
      entityId: user?.id,
      metadata: { email: input.email, reason: !user ? "not_found" : "inactive" },
      ...meta,
    })
    throw invalidCredentialsError
  }

  const passwordValid = await verifyPassword(input.password, user.password)
  if (!passwordValid) {
    await recordAuditLog({
      userId: user.id,
      action: "LOGIN_FAILED",
      entityType: "User",
      entityId: user.id,
      metadata: { reason: "bad_password" },
      ...meta,
    })
    throw invalidCredentialsError
  }

  const { accessToken, refreshToken } = await issueTokenPair(
    user.id,
    user.role,
    user.employee?.id ?? null,
    meta
  )

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await recordAuditLog({ userId: user.id, action: "LOGIN_SUCCESS", entityType: "User", entityId: user.id, ...meta })

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      employeeId: user.employee?.id ?? null,
    },
  }
}

export async function logout(refreshToken: string | undefined, meta: RequestMeta) {
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken)
    const record = await prisma.refreshToken.findUnique({ where: { tokenHash } })
    if (record && !record.revokedAt) {
      await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } })
      await recordAuditLog({ userId: record.userId, action: "LOGOUT", entityType: "User", entityId: record.userId, ...meta })
    }
  }
}

export async function refreshSession(refreshToken: string | undefined, meta: RequestMeta) {
  if (!refreshToken) throw new UnauthorizedError("Missing refresh token")

  const tokenHash = hashToken(refreshToken)
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } })

  if (!record || record.expiresAt < new Date()) {
    throw new UnauthorizedError("Session expired, please log in again")
  }

  if (record.revokedAt) {
    // A previously-rotated (or logged-out) refresh token being reused is a
    // strong signal of token theft — revoke the whole family defensively.
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    await recordAuditLog({
      userId: record.userId,
      action: "REFRESH_TOKEN_REUSE_DETECTED",
      entityType: "User",
      entityId: record.userId,
      ...meta,
    })
    throw new UnauthorizedError("Session expired, please log in again")
  }

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    include: { employee: { select: { id: true } } },
  })
  if (!user || !user.isActive) throw new UnauthorizedError()

  const newRefreshToken = generateOpaqueToken()
  const newTokenHash = hashToken(newRefreshToken)
  const env = getEnv()

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), replacedByTokenHash: newTokenHash },
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN)),
        createdByIp: meta.ipAddress ?? undefined,
      },
    }),
  ])

  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    employeeId: user.employee?.id ?? null,
  })

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      employeeId: user.employee?.id ?? null,
    },
  }
}

export async function requestPasswordReset(email: string, meta: RequestMeta) {
  const user = await prisma.user.findUnique({ where: { email } })

  // Always behave the same way whether or not the account exists, so the
  // response can't be used to enumerate registered emails.
  if (user && user.isActive) {
    const token = generateOpaqueToken()
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
      },
    })

    const env = getEnv()
    const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
    const template = passwordResetEmailTemplate(resetUrl)
    await sendMail({ to: user.email, ...template })

    await recordAuditLog({ userId: user.id, action: "PASSWORD_RESET_REQUESTED", entityType: "User", entityId: user.id, ...meta })
  }
}

export async function resetPassword(input: ResetPasswordInput, meta: RequestMeta) {
  const tokenHash = hashToken(input.token)
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ValidationError("This reset link is invalid or has expired")
  }

  const newPasswordHash = await hashPassword(input.password)

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: newPasswordHash, mustChangePassword: false } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Force re-authentication everywhere after a password reset.
    prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ])

  await recordAuditLog({ userId: record.userId, action: "PASSWORD_RESET", entityType: "User", entityId: record.userId, ...meta })
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  meta: RequestMeta,
  currentRefreshToken: string | undefined
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  const isValid = await verifyPassword(input.currentPassword, user.password)
  if (!isValid) throw new ValidationError("Current password is incorrect")

  const newPasswordHash = await hashPassword(input.newPassword)
  await prisma.user.update({
    where: { id: userId },
    data: { password: newPasswordHash, mustChangePassword: false },
  })

  // Revoke every other active session, but keep the caller's current one
  // alive so they aren't logged out by their own password change.
  const keepTokenHash = currentRefreshToken ? hashToken(currentRefreshToken) : undefined
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(keepTokenHash ? { tokenHash: { not: keepTokenHash } } : {}),
    },
    data: { revokedAt: new Date() },
  })

  await recordAuditLog({ userId, action: "PASSWORD_CHANGED", entityType: "User", entityId: userId, ...meta })
}
