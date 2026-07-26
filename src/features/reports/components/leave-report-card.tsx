"use client"

import { useState } from "react"
import { format, startOfMonth } from "date-fns"
import { FileSpreadsheet, FileText, Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"
import { LEAVE_STATUS_BADGE, LEAVE_STATUS_LABELS } from "@/features/leave/lib/status-labels"

const ALL = "__all__"

type ReportRow = {
  startDate: string
  endDate: string
  days: number
  status: string
  reason: string
  leaveType: { name: string }
  employee: { employeeCode: string; firstName: string; lastName: string; department: { name: string } | null }
}

export function LeaveReportCard({
  departments,
  leaveTypes,
}: {
  departments: { id: string; name: string }[]
  leaveTypes: { id: string; name: string }[]
}) {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"))
  const [departmentId, setDepartmentId] = useState(ALL)
  const [leaveTypeId, setLeaveTypeId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [rows, setRows] = useState<ReportRow[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function buildParams() {
    const params = new URLSearchParams({ dateFrom, dateTo })
    if (departmentId !== ALL) params.set("departmentId", departmentId)
    if (leaveTypeId !== ALL) params.set("leaveTypeId", leaveTypeId)
    if (status !== ALL) params.set("status", status)
    return params
  }

  async function runReport() {
    setIsLoading(true)
    try {
      const result = await apiFetch<{ rows: ReportRow[] }>(`/api/reports/leave?${buildParams()}`)
      if (result.success) setRows(result.data.rows)
    } finally {
      setIsLoading(false)
    }
  }

  function exportUrl(exportFormat: "xlsx" | "csv") {
    const params = buildParams()
    params.set("format", exportFormat)
    return `/api/reports/leave?${params}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Report</CardTitle>
        <CardDescription>Leave requests overlapping a date range, by department, type, or status.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
          </div>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Leave type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {leaveTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {Object.entries(LEAVE_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runReport} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
            Run
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" asChild>
              <a href={exportUrl("xlsx")}>
                <FileSpreadsheet /> Excel
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={exportUrl("csv")}>
                <FileText /> CSV
              </a>
            </Button>
          </div>
        </div>

        {rows && (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No leave requests for this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {row.employee.firstName} {row.employee.lastName}
                      </TableCell>
                      <TableCell>{row.employee.department?.name ?? "—"}</TableCell>
                      <TableCell>{row.leaveType.name}</TableCell>
                      <TableCell>{format(new Date(row.startDate), "dd MMM yyyy")}</TableCell>
                      <TableCell>{format(new Date(row.endDate), "dd MMM yyyy")}</TableCell>
                      <TableCell>{row.days}</TableCell>
                      <TableCell>
                        <Badge className={LEAVE_STATUS_BADGE[row.status]}>{LEAVE_STATUS_LABELS[row.status] ?? row.status}</Badge>
                      </TableCell>
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
