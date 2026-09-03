import { SignJWT, jwtVerify } from "jose"
import type { Role } from "@prisma/client"

// Read `process.env.X` as static property accesses rather than a
// whole-object zod parse — this file is imported from `src/proxy.ts`, which
// runs on every request, so keeping it free of the aggregated env helper's
// full-schema validation keeps that hot path cheap.
const JWT_SECRET = process.env.JWT_SECRET ?? ""
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m"

if (!JWT_SECRET) {
  // Actual verification below will still fail closed if the secret is
  // genuinely missing — this is just so the cause shows up in logs.
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
