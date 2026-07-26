"use client"

import { useState } from "react"
import { FileSpreadsheet, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const ALL = "__all__"
const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]

export function EmployeeReportCard({ departments }: { departments: { id: string; name: string }[] }) {
  const [departmentId, setDepartmentId] = useState(ALL)
  const [status, setStatus] = useState(ALL)

  function exportUrl(format: "xlsx" | "pdf") {
    const params = new URLSearchParams({ format })
    if (departmentId !== ALL) params.set("departmentId", departmentId)
    if (status !== ALL) params.set("status", status)
    return `/api/employees/export?${params}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Directory</CardTitle>
        <CardDescription>Full employee list, optionally filtered by department or status.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-2">
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
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" asChild>
            <a href={exportUrl("xlsx")}>
              <FileSpreadsheet /> Excel
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={exportUrl("pdf")}>
              <FileText /> PDF
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
