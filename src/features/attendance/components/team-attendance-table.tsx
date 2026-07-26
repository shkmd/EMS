"use client"

import { useEffect, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"
import { ATTENDANCE_STATUS_BADGE, ATTENDANCE_STATUS_LABELS } from "@/features/attendance/lib/status"

type TeamMember = {
  id: string
  firstName: string
  lastName: string
  profilePhotoUrl: string | null
  department: string | null
  today: { status: string; checkIn: string | null; checkOut: string | null } | null
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

function formatTime(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function TeamAttendanceTable() {
  const [team, setTeam] = useState<TeamMember[] | null>(null)

  useEffect(() => {
    apiFetch<{ team: TeamMember[] }>("/api/attendance/team").then((result) => {
      if (result.success) setTeam(result.data.team)
    })
  }, [])

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
