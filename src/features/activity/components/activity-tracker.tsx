"use client"

import { useEffect, useRef } from "react"

import { apiFetch } from "@/lib/api-client"

const IDLE_THRESHOLD_MS = 60_000
const HEARTBEAT_INTERVAL_MS = 30_000
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const

/**
 * Silently reports active/idle state for today's ScreenActivity row while
 * this tab is open. Idle = no mouse/keyboard/scroll activity for 60s, or
 * the tab isn't the visible one — not a system-wide idle signal, just
 * "were they interacting with EMS." Renders nothing.
 */
export function ActivityTracker() {
  const lastActivityRef = useRef(Date.now())

  useEffect(() => {
    function markActive() {
      lastActivityRef.current = Date.now()
    }
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActive, { passive: true }))

    function currentState(): "active" | "idle" {
      if (document.visibilityState !== "visible") return "idle"
      return Date.now() - lastActivityRef.current < IDLE_THRESHOLD_MS ? "active" : "idle"
    }

    function sendHeartbeat() {
      apiFetch("/api/activity/heartbeat", { method: "POST", body: { state: currentState() } }).catch(() => {
        // best-effort — a missed heartbeat just gets capped/absorbed server-side
      })
    }

    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
    document.addEventListener("visibilitychange", sendHeartbeat)

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActive))
      document.removeEventListener("visibilitychange", sendHeartbeat)
      clearInterval(interval)
    }
  }, [])

  return null
}
