"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Eye, Trash2 } from "lucide-react"

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
import { PERMISSION_STATUS_BADGE, PERMISSION_STATUS_LABELS } from "@/features/permission/lib/status-labels"
import { formatTime12h } from "@/features/permission/lib/time"
import { RecordPermissionDialog } from "@/features/permission/components/record-permission-dialog"
import { PermissionRequestDetailDialog, type PermissionRequestDetail } from "@/features/permission/components/permission-request-detail-dialog"

type EmployeeOption = { id: string; name: string; profilePhotoUrl: string | null }

type RequestRow = {
  id: string
  date: string
  fromTime: string | null
  toTime: string | null
  hours: number
  reason: string
  status: string
  employee: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null }
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

export function PermissionAllRequestsTable({ canRecord }: { canRecord: boolean }) {
  const [requests, setRequests] = useState<RequestRow[] | null>(null)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [employeeId, setEmployeeId] = useState<string>("all")
  const [viewing, setViewing] = useState<PermissionRequestDetail | null>(null)
  const [deleting, setDeleting] = useState<RequestRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function load(employeeFilter: string) {
    const query = employeeFilter === "all" ? "" : `&employeeId=${employeeFilter}`
    const result = await apiFetch<{ requests: RequestRow[] }>(`/api/permission?scope=all${query}`)
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

  async function handleView(id: string) {
    const result = await apiFetch<{ request: PermissionRequestDetail }>(`/api/permission/${id}`)
    if (result.success) setViewing(result.data.request)
  }

  async function handleDeleteConfirm() {
    if (!deleting) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/permission/${deleting.id}`, { method: "DELETE" })
      if (result.success) {
        setDeleting(null)
        load(employeeId)
      }
    } finally {
      setIsDeleting(false)
    }
  }

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
          {canRecord && <RecordPermissionDialog onSaved={() => load(employeeId)} />}
        </div>
        {!requests ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No permission requests found.
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
                      <TableCell>{format(new Date(r.date), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        {r.fromTime && r.toTime ? `${formatTime12h(r.fromTime)} – ${formatTime12h(r.toTime)}` : `${r.hours}h`}
                      </TableCell>
                      <TableCell>
                        <Badge className={PERMISSION_STATUS_BADGE[r.status]}>{PERMISSION_STATUS_LABELS[r.status] ?? r.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{r.reason}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="size-7" title="View full details" onClick={() => handleView(r.id)}>
                            <Eye className="size-3.5" />
                          </Button>
                          {canRecord && (
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

      <PermissionRequestDetailDialog
        request={viewing}
        open={!!viewing}
        onOpenChange={(next) => {
          if (!next) setViewing(null)
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this permission request?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  This will permanently remove {deleting.employee.firstName} {deleting.employee.lastName}&apos;s permission
                  request for {format(new Date(deleting.date), "dd MMM yyyy")}. This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
