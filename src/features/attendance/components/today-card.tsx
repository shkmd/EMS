"use client"

import { Coffee, LogIn, LogOut, Loader2, Home } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ATTENDANCE_STATUS_BADGE, ATTENDANCE_STATUS_LABELS } from "@/features/attendance/lib/status"
import { useTodayAttendance, formatDuration, formatTime, type Attendance } from "@/features/attendance/lib/use-today-attendance"

export function TodayCard({ initial }: { initial: Attendance }) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today</CardTitle>
        <CardDescription>
          {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {attendance?.status && (
            <Badge className={ATTENDANCE_STATUS_BADGE[attendance.status]}>
              {ATTENDANCE_STATUS_LABELS[attendance.status] ?? attendance.status}
            </Badge>
          )}
          <div className="text-sm text-muted-foreground">
            In: <span className="font-medium text-foreground">{formatTime(attendance?.checkIn ?? null)}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Out: <span className="font-medium text-foreground">{formatTime(attendance?.checkOut ?? null)}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Working hours:{" "}
            <span className="font-medium text-foreground">{formatDuration(liveWorkingMinutes)}</span>
          </div>
          {(attendance?.breakMinutes ?? 0) > 0 && (
            <div className="text-sm text-muted-foreground">
              Breaks: <span className="font-medium text-foreground">{formatDuration(attendance!.breakMinutes)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {!hasCheckedIn && (
            <>
              <Button onClick={handleCheckIn} disabled={!!loadingAction}>
                {loadingAction === "checkin" ? <Loader2 className="animate-spin" /> : <LogIn />}
                Check In
              </Button>
              <Button
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
              variant="outline"
              onClick={() => runAction("break-start", "/api/attendance/break/start")}
              disabled={!!loadingAction}
            >
              {loadingAction === "break-start" ? <Loader2 className="animate-spin" /> : <Coffee />}
              Start Break
            </Button>
          )}
          {hasCheckedIn && !hasCheckedOut && openBreak && (
            <Button onClick={() => runAction("break-end", "/api/attendance/break/end")} disabled={!!loadingAction}>
              {loadingAction === "break-end" ? <Loader2 className="animate-spin" /> : <Coffee />}
              End Break
            </Button>
          )}
          {hasCheckedIn && !hasCheckedOut && (
            <Button
              variant="destructive"
              onClick={() => runAction("checkout", "/api/attendance/check-out")}
              disabled={!!loadingAction || !!openBreak}
            >
              {loadingAction === "checkout" ? <Loader2 className="animate-spin" /> : <LogOut />}
              Check Out
            </Button>
          )}
          {hasCheckedOut && <p className="text-sm text-muted-foreground">You&apos;re all done for today.</p>}
        </div>
      </CardContent>
    </Card>
  )
}
