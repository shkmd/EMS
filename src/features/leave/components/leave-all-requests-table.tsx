"use client"

import { useEffect, useState } from "react"
import { format, isSameDay } from "date-fns"
import { Eye, Pencil, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"
import { LEAVE_STATUS_BADGE, LEAVE_STATUS_LABELS } from "@/features/leave/lib/status-labels"
import { EditLeaveRequestDialog } from "@/features/leave/components/edit-leave-request-dialog"
import { RecordPastLeaveDialog } from "@/features/leave/components/record-past-leave-dialog"
import { LeaveRequestDetailDialog } from "@/features/leave/components/leave-request-detail-dialog"
import type { LeaveRequestUpdateInput } from "@/features/leave/schemas"

type EmployeeOption = { id: string; name: string; profilePhotoUrl: string | null }

type RequestRow = {
  id: string
  startDate: string
  endDate: string
  duration: string
  days: number
  reason: string
  status: string
  createdAt: string
  leaveType: { id: string; name: string }
  employee: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null }
  manager: { firstName: string; lastName: string } | null
  managerActionAt: string | null
  managerComment: string | null
  hr: { firstName: string; lastName: string } | null
  hrActionAt: string | null
  hrComment: string | null
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
  const [viewing, setViewing] = useState<RequestRow | null>(null)
  const [deleting, setDeleting] = useState<RequestRow | null>(null)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [employeeId, setEmployeeId] = useState<string>("all")

  async function load(employeeFilter: string) {
    const query = employeeFilter === "all" ? "" : `&employeeId=${employeeFilter}`
    const result = await apiFetch<{ requests: RequestRow[] }>(`/api/leave?scope=all${query}`)
    if (result.success) setRequests(result.data.requests)
  }

  useEffect(() => {
    load(employeeId)
  }, [employeeId])

  useEffect(() => {
    apiFetch<{ employees: EmployeeOption[] }>("/api/projects/employees").then((result) => {
      if (result.success) setEmployees(result.data.employees)
    })
  }, [])

  async function handleDelete() {
    if (!deleting) return
    const result = await apiFetch(`/api/leave/${deleting.id}`, { method: "DELETE" })
    if (result.success) {
      setDeleting(null)
      load(employeeId)
    }
  }

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
        <div className="mb-4 flex items-center justify-between gap-3">
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && <RecordPastLeaveDialog leaveTypes={leaveTypes} onSaved={() => load(employeeId)} />}
        </div>
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
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="size-7" title="View full details" onClick={() => setViewing(r)}>
                            <Eye className="size-3.5" />
                          </Button>
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="size-7" title="Correct this request" onClick={() => setEditing(r)}>
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:text-destructive"
                              title="Delete this request"
                              onClick={() => setDeleting(r)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <LeaveRequestDetailDialog
        request={viewing}
        open={!!viewing}
        onOpenChange={(next) => {
          if (!next) setViewing(null)
        }}
      />

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
            load(employeeId)
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this leave request?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  This will permanently remove {deleting.employee.firstName} {deleting.employee.lastName}&apos;s{" "}
                  {deleting.leaveType.name} request for {format(new Date(deleting.startDate), "dd MMM yyyy")}
                  {!isSameDay(new Date(deleting.startDate), new Date(deleting.endDate)) &&
                    ` – ${format(new Date(deleting.endDate), "dd MMM yyyy")}`}
                  . If it was approved and paid, the balance will be restored. This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
