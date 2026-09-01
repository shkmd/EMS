"use client"

import { useEffect } from "react"

/** Registers the service worker unconditionally on every page load — not
 * just when a user opts into push notifications (features/*​/push-client.ts
 * registers the same file for that separately, which is a harmless no-op
 * re-registration if this already ran). An active service worker is what
 * lets browsers treat this as an installable app and enables the offline
 * fallback page (see public/sw.js). Renders nothing. */
export function PwaServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error)
    })
  }, [])

  return null
}
