"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Download, Eye } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api-client"
import {
  EXPENSE_STATUS_BADGE_CLASSES,
  EXPENSE_STATUS_LABELS,
  EXPENSE_CATEGORY_LABELS,
} from "@/features/expenses/lib/status-labels"
import type { ExpenseCategory, ExpenseClaimStatus } from "@prisma/client"

type ExpenseClaimDetail = {
  id: string
  category: ExpenseCategory
  title: string
  description: string | null
  amount: string
  expenseDate: string
  status: ExpenseClaimStatus
  receiptName: string | null
  managerActionAt: string | null
  managerComment: string | null
  hrActionAt: string | null
  hrComment: string | null
  reimbursedAt: string | null
  createdAt: string
  employee: { firstName: string; lastName: string }
  manager: { firstName: string; lastName: string } | null
  hr: { firstName: string; lastName: string } | null
}

export function ExpenseDetailDialog({
  claimId,
  onOpenChange,
}: {
  claimId: string | null
  onOpenChange: (open: boolean) => void
}) {
  const [detail, setDetail] = useState<ExpenseClaimDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!claimId) {
      setDetail(null)
      return
    }
    setIsLoading(true)
    apiFetch<{ claim: ExpenseClaimDetail }>(`/api/expenses/${claimId}`)
      .then((result) => {
        if (result.success) setDetail(result.data.claim)
      })
      .finally(() => setIsLoading(false))
  }, [claimId])

  return (
    <Dialog open={!!claimId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Expense claim details</DialogTitle>
        </DialogHeader>
        {isLoading || !detail ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{detail.title}</p>
                <p className="text-muted-foreground">
                  {detail.employee.firstName} {detail.employee.lastName} · {EXPENSE_CATEGORY_LABELS[detail.category]}
                </p>
              </div>
              <Badge className={EXPENSE_STATUS_BADGE_CLASSES[detail.status]}>
                {EXPENSE_STATUS_LABELS[detail.status]}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-medium">{Number(detail.amount).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expense date</p>
                <p className="font-medium">{format(new Date(detail.expenseDate), "dd MMM yyyy")}</p>
              </div>
            </div>

            {detail.description && (
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p>{detail.description}</p>
              </div>
            )}

            {detail.receiptName && (
              <div className="flex items-center justify-between rounded-md border p-2">
                <span className="truncate text-sm">{detail.receiptName}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" asChild>
                    <a
                      href={`/api/expenses/${detail.id}/receipt?disposition=inline`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Eye />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon-sm" asChild>
                    <a href={`/api/expenses/${detail.id}/receipt`} download>
                      <Download />
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {(detail.managerComment || detail.managerActionAt) && (
              <div>
                <p className="text-xs text-muted-foreground">Manager</p>
                <p>
                  {detail.manager ? `${detail.manager.firstName} ${detail.manager.lastName}` : "—"}
                  {detail.managerActionAt && ` · ${format(new Date(detail.managerActionAt), "dd MMM yyyy")}`}
                </p>
                {detail.managerComment && (
                  <p className="text-muted-foreground">&quot;{detail.managerComment}&quot;</p>
                )}
              </div>
            )}

            {(detail.hrComment || detail.hrActionAt) && (
              <div>
                <p className="text-xs text-muted-foreground">HR</p>
                <p>
                  {detail.hr ? `${detail.hr.firstName} ${detail.hr.lastName}` : "—"}
                  {detail.hrActionAt && ` · ${format(new Date(detail.hrActionAt), "dd MMM yyyy")}`}
                </p>
                {detail.hrComment && <p className="text-muted-foreground">&quot;{detail.hrComment}&quot;</p>}
              </div>
            )}

            {detail.reimbursedAt && (
              <div>
                <p className="text-xs text-muted-foreground">Reimbursed</p>
                <p>{format(new Date(detail.reimbursedAt), "dd MMM yyyy")}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">Submitted {format(new Date(detail.createdAt), "dd MMM yyyy")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
