"use client"

// Converts a URL-safe base64 VAPID public key string into the raw byte
// array pushManager.subscribe() requires as applicationServerKey.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0))
}

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
}

/** iOS Safari only exposes PushManager once the site is running as an
 * installed ("standalone") app — never in a regular browser tab, even on
 * versions that otherwise support web push. Lets the UI explain *why*
 * notifications aren't available yet instead of just hiding the option. */
export function needsHomeScreenInstallForIOSPush() {
  if (typeof window === "undefined" || isPushSupported()) return false
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true
  return isIOS && !isStandalone
}

export async function getPushSubscriptionState(): Promise<"unsupported" | "denied" | "subscribed" | "unsubscribed"> {
  if (!isPushSupported()) return "unsupported"
  if (Notification.permission === "denied") return "denied"

  const registration = await navigator.serviceWorker.getRegistration()
  const existing = await registration?.pushManager.getSubscription()
  return existing ? "subscribed" : "unsubscribed"
}

export async function enablePushNotifications() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) throw new Error("Push notifications aren't configured on this server yet")

  const permission = await Notification.requestPermission()
  if (permission !== "granted") throw new Error("Notification permission was not granted")

  const registration = await navigator.serviceWorker.register("/sw.js")
  await navigator.serviceWorker.ready

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  const json = subscription.toJSON()
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  })
  const result = await res.json()
  if (!result.success) throw new Error(result.error?.message || "Failed to save push subscription")
}

export async function disablePushNotifications() {
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ endpoint }),
  })
}
