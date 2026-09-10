import "server-only"

import type { CallSignal } from "@/features/messaging/lib/realtime"

type PendingCall = {
  conversationId: string
  fromUserId: string
  signal: Extract<CallSignal, { kind: "invite" }>
  expiresAt: number
}

const TTL_MS = 45_000

// Same globalThis-singleton reasoning as realtime.ts's EventEmitter — Next
// compiles each route into its own bundle, so mutations.ts (setting a
// pending call) and stream/route.ts (reading it on connect) would each get
// their own empty Map without a process-wide global to share.
const globalForPendingCalls = globalThis as unknown as { pendingCalls: Map<string, PendingCall> | undefined }

const pendingCalls = globalForPendingCalls.pendingCalls ?? new Map<string, PendingCall>()
globalForPendingCalls.pendingCalls = pendingCalls

export function setPendingCall(toUserId: string, call: Omit<PendingCall, "expiresAt">) {
  pendingCalls.set(toUserId, { ...call, expiresAt: Date.now() + TTL_MS })
}

/** Returns the pending invite for this user, if any and not yet expired —
 * clearing it out first if it has. */
export function getPendingCall(userId: string): PendingCall | null {
  const call = pendingCalls.get(userId)
  if (!call) return null
  if (call.expiresAt < Date.now()) {
    pendingCalls.delete(userId)
    return null
  }
  return call
}

/** Only clears if the stored entry is for this exact call — so an
 * accept/decline/end for an OLD call can't wipe out a newer invite that
 * happened to arrive for the same recipient in between. */
export function clearPendingCall(userId: string, callId: string) {
  const call = pendingCalls.get(userId)
  if (call?.signal.callId === callId) pendingCalls.delete(userId)
}
