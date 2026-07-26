"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Check, Download, FileSpreadsheet, Loader2, MoreHorizontal, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { apiFetch } from "@/lib/api-client"
import { GeneratePayslipDialog } from "@/features/payroll/components/generate-payslip-dialog"
import { PAYSLIP_STATUS_BADGE } from "@/features/payroll/lib/status-labels"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const ALL = "__all__"

type PayslipRow = {
  id: string
  month: number
  year: number
  basic: string
  grossEarnings: string
  totalDeductions: string
  netSalary: string
  status: string
  employee: { id: string; employeeCode: string; firstName: string; lastName: string; department: { name: string } | null }
}

export function PayrollTable({ employees }: { employees: { id: string; label: string }[] }) {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [status, setStatus] = useState(ALL)
  const [rows, setRows] = useState<PayslipRow[] | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PayslipRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)

  function buildParams() {
    const params = new URLSearchParams()
    if (month !== ALL) params.set("month", month)
    if (year) params.set("year", year)
    if (status !== ALL) params.set("status", status)
    return params
  }

  async function load() {
    const result = await apiFetch<{ payslips: PayslipRow[] }>(`/api/payroll?${buildParams()}`)
    if (result.success) setRows(result.data.payslips)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, status])

  async function handleMarkPaid(row: PayslipRow) {
    setPayingId(row.id)
    try {
      const result = await apiFetch(`/api/payroll/${row.id}/mark-paid`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Marked as paid")
      load()
    } finally {
      setPayingId(null)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/payroll/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Payslip deleted")
      setDeleteTarget(null)
      load()
    } finally {
      setIsDeleting(false)
    }
  }

  function exportUrl() {
    const params = buildParams()
    return `/api/payroll/export?${params}`
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-40">
            <SelectValue />
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
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="GENERATED">Generated</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" asChild className="ml-auto">
          <a href={exportUrl()}>
            <FileSpreadsheet /> Export Excel
          </a>
        </Button>
        <GeneratePayslipDialog employees={employees} onSaved={load} />
      </div>

      {!rows ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No payslips for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.employee.firstName} {r.employee.lastName}
                    </TableCell>
                    <TableCell>{r.employee.department?.name ?? "—"}</TableCell>
                    <TableCell>
                      {MONTHS[r.month - 1]} {r.year}
                    </TableCell>
                    <TableCell>{Number(r.grossEarnings).toFixed(2)}</TableCell>
                    <TableCell>{Number(r.totalDeductions).toFixed(2)}</TableCell>
                    <TableCell className="font-medium">{Number(r.netSalary).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={PAYSLIP_STATUS_BADGE[r.status]}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a href={`/api/payroll/${r.id}/pdf`}>
                              <Download /> Download PDF
                            </a>
                          </DropdownMenuItem>
                          {r.status !== "PAID" && (
                            <DropdownMenuItem onClick={() => handleMarkPaid(r)} disabled={payingId === r.id}>
                              {payingId === r.id ? <Loader2 className="animate-spin" /> : <Check />}
                              Mark as paid
                            </DropdownMenuItem>
                          )}
                          {r.status !== "PAID" && (
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(r)}>
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payslip?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  This will delete the {MONTHS[deleteTarget.month - 1]} {deleteTarget.year} payslip for{" "}
                  {deleteTarget.employee.firstName} {deleteTarget.employee.lastName}.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
