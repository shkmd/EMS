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
const globalForRealtime = globalThis as unknown as { messagingEmitter: EventEmitter | undefined }

const emitter = globalForRealtime.messagingEmitter ?? new EventEmitter()
emitter.setMaxListeners(0)

if (process.env.NODE_ENV !== "production") {
  globalForRealtime.messagingEmitter = emitter
}

export function publishToEmployee(employeeId: string, event: RealtimeMessageEvent) {
  emitter.emit(`employee:${employeeId}`, event)
}

export function subscribeToEmployee(employeeId: string, listener: (event: RealtimeMessageEvent) => void) {
  emitter.on(`employee:${employeeId}`, listener)
  return () => emitter.off(`employee:${employeeId}`, listener)
}
