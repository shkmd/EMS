"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { apiFetch } from "@/lib/api-client"

type Break = { id: string; breakStart: string; breakEnd: string | null }
export type Attendance = {
  id: string
  status: string
  checkIn: string | null
  checkOut: string | null
  workingMinutes: number
  breakMinutes: number
  breaks: Break[]
} | null

/** Best-effort location for the office geofence check — never blocks
 * check-in on denial/timeout/unsupported, since IP may still cover it (or
 * neither may be configured at all). Resolves null rather than rejecting. */
function getCurrentCoords(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null)
      return
    }
    let settled = false
    const finish = (value: { latitude: number; longitude: number } | null) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    const timeout = setTimeout(() => finish(null), 8000)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout)
        finish({ latitude: position.coords.latitude, longitude: position.coords.longitude })
      },
      () => {
        clearTimeout(timeout)
        finish(null)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  })
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

export function formatTime(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

/** Shared check-in/out/break state and actions for the dashboard's Today
 * bar and the Attendance page's Today card — same data, two different
 * presentations. */
export function useTodayAttendance(initial: Attendance) {
  const router = useRouter()
  const [attendance, setAttendance] = useState(initial)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const openBreak = attendance?.breaks.find((b) => !b.breakEnd)
  const hasCheckedIn = !!attendance?.checkIn
  const hasCheckedOut = !!attendance?.checkOut

  const liveWorkingMinutes =
    hasCheckedIn && !hasCheckedOut
      ? Math.max(
          0,
          Math.round((now.getTime() - new Date(attendance!.checkIn!).getTime()) / 60000) -
            (attendance?.breakMinutes ?? 0)
        )
      : (attendance?.workingMinutes ?? 0)

  async function runAction(action: string, url: string, body?: unknown) {
    setLoadingAction(action)
    try {
      const result = await apiFetch<{ attendance?: Attendance }>(url, { method: "POST", body })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Done")
      router.refresh()
      const res = await apiFetch<{ attendance: Attendance }>("/api/attendance/today")
      if (res.success) setAttendance(res.data.attendance)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleCheckIn() {
    setLoadingAction("checkin")
    const coords = await getCurrentCoords()
    await runAction("checkin", "/api/attendance/check-in", coords ? { latitude: coords.latitude, longitude: coords.longitude } : undefined)
  }

  return {
    attendance,
    loadingAction,
    openBreak,
    hasCheckedIn,
    hasCheckedOut,
    liveWorkingMinutes,
    runAction,
    handleCheckIn,
  }
}
