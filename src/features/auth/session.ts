import "server-only"

import { cookies } from "next/headers"

import { verifyAccessToken, type AccessTokenPayload } from "@/lib/jwt"
import { UnauthorizedError, ForbiddenError } from "@/lib/errors"
import { ACCESS_TOKEN_COOKIE } from "@/features/auth/constants"
import type { Role } from "@prisma/client"

/**
 * Reads and verifies the access token cookie. Returns null if missing,
 * expired, or invalid — callers decide whether that's acceptable.
 */
export async function getSession(): Promise<AccessTokenPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
  if (!token) return null

  try {
    return await verifyAccessToken(token)
  } catch {
    return null
  }
}

export async function requireSession(): Promise<AccessTokenPayload> {
  const session = await getSession()
  if (!session) throw new UnauthorizedError()
  return session
}

export async function requireRole(roles: Role[]): Promise<AccessTokenPayload> {
  const session = await requireSession()
  if (!roles.includes(session.role)) throw new ForbiddenError()
  return session
}
