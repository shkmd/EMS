import { SignJWT, jwtVerify } from "jose"
import type { Role } from "@prisma/client"

// Deliberately read `process.env.X` as static property accesses (not via a
// whole-object zod parse) — this file is imported from `middleware.ts`,
// which runs on the Edge runtime. Next's edge bundler only inlines env vars
// it can statically detect as `process.env.NAME` in source, so routing this
// through the aggregated env helper would leave the secret undefined there.
const JWT_SECRET = process.env.JWT_SECRET ?? ""
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m"

if (!JWT_SECRET && process.env.NEXT_RUNTIME !== "edge") {
  // Edge middleware initializes before some env injection in certain
  // deployment targets; only hard-fail in the Node runtime so we don't
  // crash middleware on a cold start ordering quirk. Actual verification
  // below will still fail closed if the secret is genuinely missing.
  console.error("JWT_SECRET is not set")
}

const secretKey = new TextEncoder().encode(JWT_SECRET)

export type AccessTokenPayload = {
  sub: string
  role: Role
  employeeId: string | null
}

export async function signAccessToken(payload: AccessTokenPayload) {
  return new SignJWT({ role: payload.role, employeeId: payload.employeeId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(JWT_ACCESS_EXPIRES_IN)
    .sign(secretKey)
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secretKey)
  return {
    sub: payload.sub as string,
    role: payload.role as Role,
    employeeId: (payload.employeeId as string | null) ?? null,
  }
}
