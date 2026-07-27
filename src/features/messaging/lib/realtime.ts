import "server-only"

import { EventEmitter } from "node:events"

export type RealtimeMessageEvent = {
  type: "message"
  conversationId: string
  message: {
    id: string
    conversationId: string
    senderId: string
    body: string | null
    attachmentUrl: string | null
    attachmentName: string | null
    attachmentType: string | null
    attachmentSize: number | null
    createdAt: string
  }
}

// This app runs as a single Node process (one Docker container replica), so
// an in-memory EventEmitter is enough for pub/sub between the mutation that
// creates a message and any open SSE connections for its recipient. A
// multi-instance deployment would need Redis (or similar) pub/sub instead —
// revisit if this ever scales past one replica.
//
// The globalThis assignment must happen unconditionally, not just in dev.
// Next.js compiles each Route Handler into its own bundle even in a
// production build, so mutations.ts (used by the send-message route) and
// stream/route.ts (the SSE route) each get their own separate evaluation of
// this module — without a process-wide global to share, they'd end up with
// two independent EventEmitters that never talk to each other (caught live:
// messages sent successfully, but the recipient's SSE stream never fired).
const globalForRealtime = globalThis as unknown as { messagingEmitter: EventEmitter | undefined }

const emitter = globalForRealtime.messagingEmitter ?? new EventEmitter()
emitter.setMaxListeners(0)
globalForRealtime.messagingEmitter = emitter

export function publishToUser(userId: string, event: RealtimeMessageEvent) {
  emitter.emit(`user:${userId}`, event)
}

export function subscribeToUser(userId: string, listener: (event: RealtimeMessageEvent) => void) {
  emitter.on(`user:${userId}`, listener)
  return () => emitter.off(`user:${userId}`, listener)
}
