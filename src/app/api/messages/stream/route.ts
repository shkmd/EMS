import { NextRequest } from "next/server"

import { requireSession } from "@/features/auth/session"
import { subscribeToUser } from "@/features/messaging/lib/realtime"
import { getPendingCall } from "@/features/messaging/lib/pending-calls"

// Long-lived streaming response — must opt out of any static/caching
// behavior Next might otherwise apply to a route handler.
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await requireSession()
  const userId = session.sub

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      const send = (event: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      controller.enqueue(encoder.encode(": connected\n\n"))

      // A client connecting late (e.g. opening the app after a push
      // notification, well after the live "invite" event fired into an
      // empty room) still needs to see the call it was invited to, as long
      // as it hasn't expired/been answered/declined/ended elsewhere.
      const pending = getPendingCall(userId)
      if (pending) {
        send({ type: "call-signal", conversationId: pending.conversationId, fromUserId: pending.fromUserId, signal: pending.signal })
      }

      const unsubscribe = subscribeToUser(userId, send)

      // Keeps the connection alive through proxies/load balancers that
      // close idle connections after a timeout (Caddy's default is well
      // above this, but cheap insurance).
      const keepAlive = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": ping\n\n"))
      }, 25000)

      req.signal.addEventListener("abort", () => {
        closed = true
        clearInterval(keepAlive)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
