import "server-only"

import { differenceInSeconds } from "date-fns"

import { prisma } from "@/lib/prisma"
import { toUtcDateOnly } from "@/lib/date-only"
import { ValidationError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import type { HeartbeatInput } from "@/features/activity/schemas"

// Caps how much elapsed time a single heartbeat can add — 3x the client's
// heartbeat interval (30s). Bounds the damage from a missed beat or two
// without letting a laptop left open overnight, or a debugger pause,
// silently add hours to either bucket on the next heartbeat.
const HEARTBEAT_CAP_SECONDS = 90

export async function recordHeartbeat(viewer: AccessTokenPayload, input: HeartbeatInput) {
  if (!viewer.employeeId) {
    throw new ValidationError("Your account isn't linked to an employee profile yet")
  }
  const employeeId = viewer.employeeId
  const date = toUtcDateOnly()
  const now = new Date()

  const existing = await prisma.screenActivity.findUnique({
    where: { employeeId_date: { employeeId, date } },
  })

  if (!existing) {
    await prisma.screenActivity.create({ data: { employeeId, date, lastSeenAt: now } })
    return
  }

  const elapsedSeconds = existing.lastSeenAt ? Math.max(0, differenceInSeconds(now, existing.lastSeenAt)) : 0
  const cappedSeconds = Math.min(elapsedSeconds, HEARTBEAT_CAP_SECONDS)

  await prisma.screenActivity.update({
    where: { id: existing.id },
    data: {
      lastSeenAt: now,
      ...(input.state === "active"
        ? { activeSeconds: { increment: cappedSeconds } }
        : { idleSeconds: { increment: cappedSeconds } }),
    },
  })
}
