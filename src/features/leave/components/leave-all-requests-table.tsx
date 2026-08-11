"use client"

import { useEffect, useState } from "react"
import { format, isSameDay } from "date-fns"
import { Pencil } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"
import { LEAVE_STATUS_BADGE, LEAVE_STATUS_LABELS } from "@/features/leave/lib/status-labels"
import { EditLeaveRequestDialog } from "@/features/leave/components/edit-leave-request-dialog"
import { RecordPastLeaveDialog } from "@/features/leave/components/record-past-leave-dialog"
import type { LeaveRequestUpdateInput } from "@/features/leave/schemas"

type RequestRow = {
  id: string
  startDate: string
  endDate: string
  duration: string
  days: number
  reason: string
  status: string
  leaveType: { id: string; name: string }
  employee: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null }
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

export function LeaveAllRequestsTable({
  canEdit,
  leaveTypes,
}: {
  canEdit: boolean
  leaveTypes: { id: string; name: string }[]
}) {
  const [requests, setRequests] = useState<RequestRow[] | null>(null)
  const [editing, setEditing] = useState<RequestRow | null>(null)

  async function load() {
    const result = await apiFetch<{ requests: RequestRow[] }>("/api/leave?scope=all")
    if (result.success) setRequests(result.data.requests)
  }

  useEffect(() => {
    load()
  }, [])

  const editingDefaults: LeaveRequestUpdateInput | undefined = editing
    ? {
        leaveTypeId: editing.leaveType.id,
        startDate: format(new Date(editing.startDate), "yyyy-MM-dd"),
        endDate: format(new Date(editing.endDate), "yyyy-MM-dd"),
        duration: editing.duration as LeaveRequestUpdateInput["duration"],
        reason: editing.reason,
        status: editing.status as LeaveRequestUpdateInput["status"],
      }
    : undefined

  return (
    <Card>
      <CardContent className="pt-6">
        {canEdit && (
          <div className="mb-4 flex justify-end">
            <RecordPastLeaveDialog leaveTypes={leaveTypes} onSaved={load} />
          </div>
        )}
        {!requests ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  {canEdit && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 7 : 6} className="h-24 text-center text-muted-foreground">
                      No leave requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            {r.employee.profilePhotoUrl && <AvatarImage src={`/api/employees/${r.employee.id}/photo`} />}
                            <AvatarFallback className="text-xs">
                              {initials(r.employee.firstName, r.employee.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {r.employee.firstName} {r.employee.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{r.leaveType.name}</TableCell>
                      <TableCell>
                        {format(new Date(r.startDate), "dd MMM yyyy")}
                        {!isSameDay(new Date(r.startDate), new Date(r.endDate)) &&
                          ` – ${format(new Date(r.endDate), "dd MMM yyyy")}`}
                      </TableCell>
                      <TableCell>{r.days}</TableCell>
                      <TableCell>
                        <Badge className={LEAVE_STATUS_BADGE[r.status]}>{LEAVE_STATUS_LABELS[r.status] ?? r.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{r.reason}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="size-7" title="Correct this request" onClick={() => setEditing(r)}>
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

      {canEdit && (
        <EditLeaveRequestDialog
          requestId={editing?.id ?? null}
          leaveTypes={leaveTypes}
          defaultValues={editingDefaults}
          open={!!editing}
          onOpenChange={(next) => {
            if (!next) setEditing(null)
          }}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </Card>
  )
}
