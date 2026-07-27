"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Download, Eye } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"
import {
  EXPENSE_STATUS_BADGE_CLASSES,
  EXPENSE_STATUS_LABELS,
  EXPENSE_CATEGORY_LABELS,
} from "@/features/expenses/lib/status-labels"
import { ExpenseDetailDialog } from "@/features/expenses/components/expense-detail-dialog"
import type { ExpenseCategory, ExpenseClaimStatus } from "@prisma/client"

type ClaimRow = {
  id: string
  category: ExpenseCategory
  title: string
  amount: string
  expenseDate: string
  status: ExpenseClaimStatus
  receiptName: string | null
  employee: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null }
}

const ALL = "__all__"

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: ALL, label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "MANAGER_APPROVED", label: "Manager Approved" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "REIMBURSED", label: "Reimbursed" },
  { value: "CANCELLED", label: "Cancelled" },
]

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

export function ExpenseAllClaimsTable({ employees }: { employees: { id: string; label: string }[] }) {
  const [claims, setClaims] = useState<ClaimRow[] | null>(null)
  const [employeeId, setEmployeeId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [viewTargetId, setViewTargetId] = useState<string | null>(null)

  useEffect(() => {
    setClaims(null)
    const params = new URLSearchParams({ scope: "all" })
    if (employeeId !== ALL) params.set("employeeId", employeeId)
    if (status !== ALL) params.set("status", status)

    apiFetch<{ claims: ClaimRow[] }>(`/api/expenses?${params}`).then((result) => {
      if (result.success) setClaims(result.data.claims)
    })
  }, [employeeId, status])

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex flex-wrap gap-2">
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="w-56">
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
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!claims ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No expense claims match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  claims.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            {c.employee.profilePhotoUrl && (
                              <AvatarImage src={`/api/employees/${c.employee.id}/photo`} />
                            )}
                            <AvatarFallback className="text-xs">
                              {initials(c.employee.firstName, c.employee.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {c.employee.firstName} {c.employee.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{c.title}</TableCell>
                      <TableCell>{EXPENSE_CATEGORY_LABELS[c.category]}</TableCell>
                      <TableCell>{format(new Date(c.expenseDate), "dd MMM yyyy")}</TableCell>
                      <TableCell>{Number(c.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        {c.receiptName ? (
                          <Button variant="ghost" size="icon-sm" asChild>
                            <a href={`/api/expenses/${c.id}/receipt`} download>
                              <Download />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={EXPENSE_STATUS_BADGE_CLASSES[c.status]}>
                          {EXPENSE_STATUS_LABELS[c.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-sm" onClick={() => setViewTargetId(c.id)}>
                          <Eye />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <ExpenseDetailDialog claimId={viewTargetId} onOpenChange={(open) => !open && setViewTargetId(null)} />
    </Card>
  )
}
