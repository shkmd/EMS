"use client"

import { useState } from "react"
import { format } from "date-fns"
import { FileSpreadsheet, FileText, Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"
import { ASSET_CATEGORY_LABELS, ASSET_STATUS_BADGE } from "@/features/assets/lib/labels"
import { assetCategoryValues, assetStatusValues } from "@/features/assets/schemas"

const ALL = "__all__"

type ReportRow = {
  assetTag: string
  category: string
  name: string
  status: string
  purchaseDate: string | null
  purchaseCost: number | null
  currentAssignment: { employee: { firstName: string; lastName: string } } | null
}

export function AssetReportCard() {
  const [category, setCategory] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [rows, setRows] = useState<ReportRow[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function buildParams() {
    const params = new URLSearchParams()
    if (category !== ALL) params.set("category", category)
    if (status !== ALL) params.set("status", status)
    return params
  }

  async function runReport() {
    setIsLoading(true)
    try {
      const result = await apiFetch<{ rows: ReportRow[] }>(`/api/reports/assets?${buildParams()}`)
      if (result.success) setRows(result.data.rows)
    } finally {
      setIsLoading(false)
    }
  }

  function exportUrl(exportFormat: "xlsx" | "csv") {
    const params = buildParams()
    params.set("format", exportFormat)
    return `/api/reports/assets?${params}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Inventory Report</CardTitle>
        <CardDescription>Full inventory with current assignment, filterable by category or status.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {assetCategoryValues.map((c) => (
                <SelectItem key={c} value={c}>
                  {ASSET_CATEGORY_LABELS[c]}
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
              {assetStatusValues.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ")}
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
                  <TableHead>Tag</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No assets match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.assetTag}>
                      <TableCell className="font-medium">{row.assetTag}</TableCell>
                      <TableCell>{ASSET_CATEGORY_LABELS[row.category] ?? row.category}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>
                        <Badge className={ASSET_STATUS_BADGE[row.status]}>{row.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>{row.purchaseDate ? format(new Date(row.purchaseDate), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell>
                        {row.currentAssignment
                          ? `${row.currentAssignment.employee.firstName} ${row.currentAssignment.employee.lastName}`
                          : "—"}
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
