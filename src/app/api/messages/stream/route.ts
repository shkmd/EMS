import { NextRequest } from "next/server"

import { requireSession } from "@/features/auth/session"
import { subscribeToUser } from "@/features/messaging/lib/realtime"

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
