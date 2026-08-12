"use client"

import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ATTENDANCE_STATUS_BADGE, ATTENDANCE_STATUS_LABELS } from "@/features/attendance/lib/status"

type Break = { id: string; breakStart: string; breakEnd: string | null }
export type AttendanceDetailMember = {
  id: string
  firstName: string
  lastName: string
  department: string | null
  today: {
    status: string
    checkIn: string | null
    checkOut: string | null
    breakMinutes: number
    breaks: Break[]
  } | null
  screenActivity: { activeSeconds: number; idleSeconds: number; lastSeenAt: string | null } | null
  dailyLog: { note: string; updatedAt: string } | null
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function formatTime(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  )
}

export function AttendanceDetailDialog({
  member,
  open,
  onOpenChange,
}: {
  member: AttendanceDetailMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member ? `${member.firstName} ${member.lastName}` : "Attendance"}</DialogTitle>
        </DialogHeader>
        {member && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Department">{member.department ?? "—"}</Field>
              <Field label="Status">
                {member.today ? (
                  <Badge className={ATTENDANCE_STATUS_BADGE[member.today.status]}>
                    {ATTENDANCE_STATUS_LABELS[member.today.status] ?? member.today.status}
                  </Badge>
                ) : (
                  <Badge variant="outline">Not marked</Badge>
                )}
              </Field>
              <Field label="Check in">{formatTime(member.today?.checkIn ?? null)}</Field>
              <Field label="Check out">{formatTime(member.today?.checkOut ?? null)}</Field>
            </div>
            <Field label="Breaks">
              {member.today?.breaks.length ? (
                <ul className="flex flex-col gap-0.5">
                  {member.today.breaks.map((b) => (
                    <li key={b.id}>
                      {formatTime(b.breakStart)} – {b.breakEnd ? formatTime(b.breakEnd) : "ongoing"}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground">No breaks recorded</span>
              )}
            </Field>
            <Field label="Screen time">
              {member.screenActivity ? (
                <span>
                  {formatDuration(member.screenActivity.activeSeconds)} active ·{" "}
                  {formatDuration(member.screenActivity.idleSeconds)} idle
                </span>
              ) : (
                <span className="text-muted-foreground">No screen activity recorded</span>
              )}
            </Field>
            <Field label="Today's update">
              {member.dailyLog ? (
                <p className="whitespace-pre-wrap">{member.dailyLog.note}</p>
              ) : (
                <span className="text-muted-foreground">No update logged</span>
              )}
            </Field>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
