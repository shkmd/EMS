"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"
import { PERMISSION_STATUS_BADGE, PERMISSION_STATUS_LABELS } from "@/features/permission/lib/status-labels"
import { RecordPermissionDialog } from "@/features/permission/components/record-permission-dialog"

type EmployeeOption = { id: string; name: string; profilePhotoUrl: string | null }

type RequestRow = {
  id: string
  date: string
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
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
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
                      <TableCell>{r.hours}</TableCell>
                      <TableCell>
                        <Badge className={PERMISSION_STATUS_BADGE[r.status]}>{PERMISSION_STATUS_LABELS[r.status] ?? r.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{r.reason}</TableCell>
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
