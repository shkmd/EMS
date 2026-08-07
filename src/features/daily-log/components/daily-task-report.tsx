"use client"

import { useState } from "react"
import { format, startOfMonth } from "date-fns"
import { FileSpreadsheet, FileText, Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"

const ALL = "__all__"

type ReportRow = {
  employeeId: string
  employeeCode: string
  firstName: string
  lastName: string
  department: string | null
  date: string
  update: string | null
  taskActivity: string | null
}

export function DailyTaskReport({
  departments,
  employees,
}: {
  departments: { id: string; name: string }[]
  employees: { id: string; label: string }[]
}) {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"))
  const [departmentId, setDepartmentId] = useState(ALL)
  const [employeeId, setEmployeeId] = useState(ALL)
  const [rows, setRows] = useState<ReportRow[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function buildParams() {
    const params = new URLSearchParams({ dateFrom, dateTo })
    if (departmentId !== ALL) params.set("departmentId", departmentId)
    if (employeeId !== ALL) params.set("employeeId", employeeId)
    return params
  }

  async function runReport() {
    setIsLoading(true)
    try {
      const result = await apiFetch<{ rows: ReportRow[] }>(`/api/daily-log/report?${buildParams()}`)
      if (result.success) setRows(result.data.rows)
    } finally {
      setIsLoading(false)
    }
  }

  function exportUrl(exportFormat: "xlsx" | "csv") {
    const params = buildParams()
    params.set("format", exportFormat)
    return `/api/daily-log/report?${params}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Tasks</CardTitle>
        <CardDescription>Each employee&apos;s daily update and task activity, by date range.</CardDescription>
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
                  <TableHead>Today&apos;s Update</TableHead>
                  <TableHead>Task Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No updates or task activity for this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={`${row.employeeId}-${row.date}`}>
                      <TableCell className="whitespace-nowrap">{format(new Date(row.date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {row.firstName} {row.lastName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{row.department ?? "—"}</TableCell>
                      <TableCell className="max-w-64">
                        <span className="line-clamp-2 text-sm" title={row.update ?? undefined}>
                          {row.update ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-80">
                        <span className="line-clamp-2 text-sm" title={row.taskActivity ?? undefined}>
                          {row.taskActivity ?? "—"}
                        </span>
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
