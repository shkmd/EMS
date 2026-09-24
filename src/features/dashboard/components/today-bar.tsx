"use client"

import { Coffee, LogIn, LogOut, Loader2, Home, Clock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ATTENDANCE_STATUS_BADGE, ATTENDANCE_STATUS_LABELS } from "@/features/attendance/lib/status"
import { useTodayAttendance, formatDuration, formatTime, type Attendance } from "@/features/attendance/lib/use-today-attendance"
import { VerticalFilter } from "@/features/dashboard/components/vertical-filter"
import { DownloadReportButton } from "@/features/dashboard/components/download-report-button"

export function TodayBar({
  initial,
  verticals,
  canSwitchVertical,
  verticalName,
  showAttendance = true,
}: {
  initial: Attendance
  verticals: { id: string; name: string }[]
  canSwitchVertical: boolean
  verticalName?: string
  showAttendance?: boolean
}) {
  const {
    attendance,
    loadingAction,
    openBreak,
    hasCheckedIn,
    hasCheckedOut,
    liveWorkingMinutes,
    runAction,
    handleCheckIn,
  } = useTodayAttendance(initial)

  const today = new Date()

  return (
    <div className="flex flex-wrap items-center gap-3">
      {showAttendance && (
      <div className="flex flex-1 flex-wrap items-center gap-4 rounded-2xl border bg-card p-3.5">
        <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <Clock className="size-4.5" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="text-sm font-bold">Today · {today.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {attendance?.status && (
              <Badge className={ATTENDANCE_STATUS_BADGE[attendance.status]}>
                {ATTENDANCE_STATUS_LABELS[attendance.status] ?? attendance.status}
              </Badge>
            )}
            <span>
              In <strong className="text-foreground">{formatTime(attendance?.checkIn ?? null)}</strong>
            </span>
            <span>
              Out <strong className="text-foreground">{formatTime(attendance?.checkOut ?? null)}</strong>
            </span>
            <span>
              Working hours <strong className="text-foreground">{formatDuration(liveWorkingMinutes)}</strong>
            </span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-2">
          {!hasCheckedIn && (
            <>
              <Button size="sm" onClick={handleCheckIn} disabled={!!loadingAction}>
                {loadingAction === "checkin" ? <Loader2 className="animate-spin" /> : <LogIn />}
                Check In
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runAction("checkin-wfh", "/api/attendance/check-in", { asWorkFromHome: true })}
                disabled={!!loadingAction}
              >
                {loadingAction === "checkin-wfh" ? <Loader2 className="animate-spin" /> : <Home />}
                Check In (WFH)
              </Button>
            </>
          )}
          {hasCheckedIn && !hasCheckedOut && !openBreak && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => runAction("break-start", "/api/attendance/break/start")}
              disabled={!!loadingAction}
            >
              {loadingAction === "break-start" ? <Loader2 className="animate-spin" /> : <Coffee />}
              Start Break
            </Button>
          )}
          {hasCheckedIn && !hasCheckedOut && openBreak && (
            <Button size="sm" onClick={() => runAction("break-end", "/api/attendance/break/end")} disabled={!!loadingAction}>
              {loadingAction === "break-end" ? <Loader2 className="animate-spin" /> : <Coffee />}
              End Break
            </Button>
          )}
          {hasCheckedIn && !hasCheckedOut && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => runAction("checkout", "/api/attendance/check-out")}
              disabled={!!loadingAction || !!openBreak}
            >
              {loadingAction === "checkout" ? <Loader2 className="animate-spin" /> : <LogOut />}
              Check Out
            </Button>
          )}
          {hasCheckedOut && <p className="text-xs text-muted-foreground">All done for today.</p>}
        </div>
      </div>
      )}

      {canSwitchVertical && verticals.length > 0 && <VerticalFilter verticals={verticals} />}
      {!canSwitchVertical && verticalName && <Badge variant="secondary">{verticalName}</Badge>}
      <DownloadReportButton />
    </div>
  )
}
