"use client"

import { useState } from "react"
import { FileSpreadsheet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const ALL = "__all__"
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const STATUS_OPTIONS = ["DRAFT", "GENERATED", "PAID"]

export function PayrollReportCard({ departments }: { departments: { id: string; name: string }[] }) {
  const [month, setMonth] = useState(ALL)
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [departmentId, setDepartmentId] = useState(ALL)
  const [status, setStatus] = useState(ALL)

  function exportUrl() {
    const params = new URLSearchParams()
    if (month !== ALL) params.set("month", month)
    if (year) params.set("year", year)
    if (departmentId !== ALL) params.set("departmentId", departmentId)
    if (status !== ALL) params.set("status", status)
    return `/api/payroll/export?${params}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Summary</CardTitle>
        <CardDescription>Payslips for a given month/year, department, or status.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-2">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All months</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Year</label>
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-24" />
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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button variant="outline" asChild>
            <a href={exportUrl()}>
              <FileSpreadsheet /> Excel
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
