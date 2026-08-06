import { timingSafeEqual } from "crypto"

import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { UnauthorizedError, ValidationError } from "@/lib/errors"
import { getEnv } from "@/config/env"
import { biometricPunchSchema } from "@/features/attendance/schemas"
import { findEmployeeByBiometricId, recordBiometricPunch } from "@/features/attendance/biometric-sync"

function assertValidApiKey(req: NextRequest) {
  const expected = getEnv().BIOMETRIC_SYNC_API_KEY
  if (!expected) throw new UnauthorizedError("Biometric sync is not configured")

  const provided = req.headers.get("x-api-key") ?? ""
  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided)
  const isValid = expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf)
  if (!isValid) throw new UnauthorizedError("Invalid API key")
}

// Authenticated via a shared API key (not a user session) — this endpoint is
// called unattended by the office bridge script that relays punches from the
// biometric device, not by a logged-in browser.
export async function POST(req: NextRequest) {
  try {
    assertValidApiKey(req)

    const body = await req.json().catch(() => null)
    const parsed = biometricPunchSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError("Invalid punch payload", parsed.error.flatten())

    const employee = await findEmployeeByBiometricId(parsed.data.biometricId)
    const attendance = await recordBiometricPunch(employee.id, parsed.data.direction, new Date(parsed.data.punchTime))

    return apiSuccess({ attendance }, "Punch recorded")
  } catch (error) {
    return apiError(error)
  }
}
