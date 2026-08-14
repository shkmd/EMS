import "server-only"

import webpush from "web-push"

import { getEnv } from "@/config/env"
import { prisma } from "@/lib/prisma"

let configured = false

function ensureConfigured() {
  if (configured) return true

  const env = getEnv()
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false

  webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
  configured = true
  return true
}

type PushPayload = { title: string; body: string; url?: string }

/**
 * Sends a push notification to every device a user has subscribed from.
 * Mirrors sendMail's fallback: logs instead of sending when VAPID keys
 * aren't configured, and silently drops subscriptions the push service
 * reports as gone (410/404 — the user uninstalled, cleared data, etc.)
 * rather than letting one dead device break the rest of a fan-out.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureConfigured()) {
    console.info(`[push] VAPID not configured — notification logged instead of sent:`, { userId, payload })
    return
  }

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subscriptions.length === 0) return

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        } else {
          console.error("[push] Failed to send push notification:", error)
        }
      }
    })
  )
}
