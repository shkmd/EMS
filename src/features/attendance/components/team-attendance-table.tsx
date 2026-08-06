"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Pencil } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"
import { ATTENDANCE_STATUS_BADGE, ATTENDANCE_STATUS_LABELS } from "@/features/attendance/lib/status"
import { ManualAttendanceDialog } from "@/features/attendance/components/manual-attendance-dialog"
import type { ManualAttendanceInput } from "@/features/attendance/schemas"

type Break = { id: string; breakStart: string; breakEnd: string | null }
type TeamMember = {
  id: string
  firstName: string
  lastName: string
  profilePhotoUrl: string | null
  department: string | null
  today: {
    status: string
    checkIn: string | null
    checkOut: string | null
    breakMinutes: number
    breaks: Break[]
  } | null
  screenActivity: { activeSeconds: number; idleSeconds: number; lastSeenAt: string | null } | null
}

const REFRESH_INTERVAL_MS = 30_000

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

// A tab open but untouched for a while (no heartbeat in the last couple of
// intervals) means the screen-time numbers are stale, not necessarily that
// the person just went idle this instant.
function isRecentlySeen(lastSeenAt: string | null) {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60_000
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

function formatTime(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function timeInputValue(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function TeamAttendanceTable({
  canManage = false,
  employees = [],
}: {
  canManage?: boolean
  employees?: { id: string; label: string }[]
}) {
  const [team, setTeam] = useState<TeamMember[] | null>(null)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)

  function loadTeam() {
    apiFetch<{ team: TeamMember[] }>("/api/attendance/team").then((result) => {
      if (result.success) setTeam(result.data.team)
    })
  }

  useEffect(() => {
    loadTeam()
    const interval = setInterval(loadTeam, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const today = format(new Date(), "yyyy-MM-dd")
  const editingDefaults: Partial<ManualAttendanceInput> | undefined = editingMember
    ? {
        employeeId: editingMember.id,
        date: today,
        status: (editingMember.today?.status as ManualAttendanceInput["status"]) ?? "PRESENT",
        checkIn: timeInputValue(editingMember.today?.checkIn ?? null),
        checkOut: timeInputValue(editingMember.today?.checkOut ?? null),
      }
    : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Attendance Today</CardTitle>
        <CardDescription>Who&apos;s in, working from home, or not yet marked.</CardDescription>
      </CardHeader>
      <CardContent>
        {!team ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Break</TableHead>
                  <TableHead>Screen Time</TableHead>
                  {canManage && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 8 : 7} className="h-24 text-center text-muted-foreground">
                      No team members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  team.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            {member.profilePhotoUrl && <AvatarImage src={`/api/employees/${member.id}/photo`} />}
                            <AvatarFallback className="text-xs">
                              {initials(member.firstName, member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {member.firstName} {member.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{member.department ?? "—"}</TableCell>
                      <TableCell>
                        {member.today ? (
                          <Badge className={ATTENDANCE_STATUS_BADGE[member.today.status]}>
                            {ATTENDANCE_STATUS_LABELS[member.today.status] ?? member.today.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not marked</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatTime(member.today?.checkIn ?? null)}</TableCell>
                      <TableCell>{formatTime(member.today?.checkOut ?? null)}</TableCell>
                      <TableCell>
                        {(() => {
                          const openBreak = member.today?.breaks.find((b) => !b.breakEnd)
                          const breakList = member.today?.breaks
                            .map((b) => `${formatTime(b.breakStart)} – ${formatTime(b.breakEnd)}`)
                            .join(", ")
                          if (openBreak) {
                            return (
                              <span className="text-xs text-amber-600 dark:text-amber-500" title={breakList}>
                                On break since {formatTime(openBreak.breakStart)}
                              </span>
                            )
                          }
                          if ((member.today?.breakMinutes ?? 0) > 0) {
                            return (
                              <span className="text-xs" title={breakList}>
                                {formatDuration(member.today!.breakMinutes * 60)}
                              </span>
                            )
                          }
                          return <span className="text-xs text-muted-foreground">—</span>
                        })()}
                      </TableCell>
                      <TableCell>
                        {member.screenActivity ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            {isRecentlySeen(member.screenActivity.lastSeenAt) && (
                              <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" title="Active recently" />
                            )}
                            <span>
                              {formatDuration(member.screenActivity.activeSeconds)} active
                              <span className="text-muted-foreground"> · {formatDuration(member.screenActivity.idleSeconds)} idle</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            title={member.today ? "Correct today's attendance" : "Mark attendance"}
                            onClick={() => setEditingMember(member)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {canManage && (
        <ManualAttendanceDialog
          employees={employees}
          trigger={null}
          open={!!editingMember}
          onOpenChange={(next) => {
            if (!next) setEditingMember(null)
          }}
          defaultValues={editingDefaults}
          onSaved={() => {
            setEditingMember(null)
            loadTeam()
          }}
        />
      )}
    </Card>
  )
}
