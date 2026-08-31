"use client"

import { useState } from "react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { FileSpreadsheet, FileText, Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"

const ALL = "__all__"

type ReportRow = {
  employeeCode: string
  firstName: string
  lastName: string
  department: string | null
  daysPresent: number
  daysLate: number
  totalLateMinutes: number
}

export function LateSummaryReportCard({ departments }: { departments: { id: string; name: string }[] }) {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"))
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"))
  const [departmentId, setDepartmentId] = useState(ALL)
  const [rows, setRows] = useState<ReportRow[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function handleMonthChange(value: string) {
    setMonth(value)
    if (!value) return
    const [year, monthNum] = value.split("-").map(Number)
    const monthDate = new Date(year, monthNum - 1, 1)
    setDateFrom(format(startOfMonth(monthDate), "yyyy-MM-dd"))
    setDateTo(format(endOfMonth(monthDate), "yyyy-MM-dd"))
  }

  function buildParams() {
    const params = new URLSearchParams({ dateFrom, dateTo })
    if (departmentId !== ALL) params.set("departmentId", departmentId)
    return params
  }

  async function runReport() {
    setIsLoading(true)
    try {
      const result = await apiFetch<{ rows: ReportRow[] }>(`/api/reports/late-summary?${buildParams()}`)
      if (result.success) setRows(result.data.rows)
    } finally {
      setIsLoading(false)
    }
  }

  function exportUrl(exportFormat: "xlsx" | "csv") {
    const params = buildParams()
    params.set("format", exportFormat)
    return `/api/reports/late-summary?${params}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Late Summary Report</CardTitle>
        <CardDescription>How many days each employee checked in late (past working hours + grace period) in a date range.</CardDescription>
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
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Or pick a month</label>
            <Input type="month" value={month} onChange={(e) => handleMonthChange(e.target.value)} className="w-40" />
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
                  <TableHead>Days Present</TableHead>
                  <TableHead>Days Late</TableHead>
                  <TableHead>Total Late (min)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No attendance records for this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.employeeCode}>
                      <TableCell>
                        {row.firstName} {row.lastName}
                      </TableCell>
                      <TableCell>{row.department ?? "—"}</TableCell>
                      <TableCell>{row.daysPresent}</TableCell>
                      <TableCell>
                        {row.daysLate > 0 ? <Badge variant="outline">{row.daysLate}</Badge> : row.daysLate}
                      </TableCell>
                      <TableCell>{row.totalLateMinutes}</TableCell>
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
