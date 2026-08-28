"use client"

import { useState } from "react"
import { format, startOfMonth } from "date-fns"
import { FileSpreadsheet, FileText, Loader2, Pencil, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/api-client"
import { ATTENDANCE_STATUS_BADGE, ATTENDANCE_STATUS_LABELS } from "@/features/attendance/lib/status"
import { ManualAttendanceDialog } from "@/features/attendance/components/manual-attendance-dialog"
import type { ManualAttendanceInput } from "@/features/attendance/schemas"

const ALL = "__all__"

type ReportRow = {
  id: string
  date: string
  status: string
  checkIn: string | null
  checkOut: string | null
  workingMinutes: number
  lateMinutes: number
  employee: { id: string; employeeCode: string; firstName: string; lastName: string; department: { name: string } | null }
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

export function AttendanceReport({
  departments,
  employees,
  canManage,
}: {
  departments: { id: string; name: string }[]
  employees: { id: string; label: string }[]
  canManage: boolean
}) {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"))
  const [departmentId, setDepartmentId] = useState(ALL)
  const [employeeId, setEmployeeId] = useState(ALL)
  const [rows, setRows] = useState<ReportRow[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [editingRow, setEditingRow] = useState<ReportRow | null>(null)

  function buildParams() {
    const params = new URLSearchParams({ dateFrom, dateTo })
    if (departmentId !== ALL) params.set("departmentId", departmentId)
    if (employeeId !== ALL) params.set("employeeId", employeeId)
    return params
  }

  async function runReport() {
    setIsLoading(true)
    try {
      const result = await apiFetch<{ rows: ReportRow[] }>(`/api/attendance/report?${buildParams()}`)
      if (result.success) setRows(result.data.rows)
    } finally {
      setIsLoading(false)
    }
  }

  function exportUrl(exportFormat: "xlsx" | "csv") {
    const params = buildParams()
    params.set("format", exportFormat)
    return `/api/attendance/report?${params}`
  }

  const editingDefaults: Partial<ManualAttendanceInput> | undefined = editingRow
    ? {
        employeeId: editingRow.employee.id,
        date: format(new Date(editingRow.date), "yyyy-MM-dd"),
        status: editingRow.status as ManualAttendanceInput["status"],
        checkIn: timeInputValue(editingRow.checkIn),
        checkOut: timeInputValue(editingRow.checkOut),
      }
    : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Report</CardTitle>
        <CardDescription>Filter by date range, department, or employee.</CardDescription>
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
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.label}
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
            {canManage && <ManualAttendanceDialog employees={employees} onSaved={runReport} />}
          </div>
        </div>

        {rows && (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>Hours</TableHead>
                  {canManage && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 9 : 8} className="h-24 text-center text-muted-foreground">
                      No records for this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{format(new Date(row.date), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        {row.employee.firstName} {row.employee.lastName}
                      </TableCell>
                      <TableCell>{row.employee.department?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className={ATTENDANCE_STATUS_BADGE[row.status]}>
                          {ATTENDANCE_STATUS_LABELS[row.status] ?? row.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatTime(row.checkIn)}</TableCell>
                      <TableCell>{formatTime(row.checkOut)}</TableCell>
                      <TableCell>
                        {row.lateMinutes > 0 ? (
                          <span className="text-amber-600 dark:text-amber-500">{row.lateMinutes}m</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{(row.workingMinutes / 60).toFixed(1)}</TableCell>
                      {canManage && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            title="Correct this record"
                            onClick={() => setEditingRow(row)}
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
          open={!!editingRow}
          onOpenChange={(next) => {
            if (!next) setEditingRow(null)
          }}
          defaultValues={editingDefaults}
          onSaved={() => {
            setEditingRow(null)
            runReport()
          }}
        />
      )}
    </Card>
  )
}
