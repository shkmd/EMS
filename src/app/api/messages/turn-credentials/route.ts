import { apiError, apiSuccess } from "@/lib/api-response"
import { ValidationError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { getEnv } from "@/config/env"
import { generateTurnCredentials } from "@/lib/turn-credentials"

export async function GET() {
  try {
    const session = await requireSession()
    const { TURN_SECRET, TURN_HOST } = getEnv()

    if (!TURN_SECRET || !TURN_HOST) {
      throw new ValidationError("Calling isn't configured on this server yet")
    }

    const { username, credential } = generateTurnCredentials(TURN_SECRET, session.sub)

    return apiSuccess({
      iceServers: [
        { urls: [`stun:${TURN_HOST}:3478`] },
        { urls: [`turn:${TURN_HOST}:3478?transport=udp`, `turn:${TURN_HOST}:3478?transport=tcp`], username, credential },
      ],
    })
  } catch (error) {
    return apiError(error)
  }
}
