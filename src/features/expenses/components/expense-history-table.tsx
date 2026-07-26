"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { Download, Eye, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import {
  EXPENSE_STATUS_BADGE_CLASSES,
  EXPENSE_STATUS_LABELS,
  EXPENSE_CATEGORY_LABELS,
} from "@/features/expenses/lib/status-labels"
import { ExpenseDetailDialog } from "@/features/expenses/components/expense-detail-dialog"
import type { ExpenseCategory, ExpenseClaimStatus } from "@prisma/client"

export type ExpenseClaimRow = {
  id: string
  category: ExpenseCategory
  title: string
  amount: number
  expenseDate: Date | string
  status: ExpenseClaimStatus
  receiptName: string | null
}

const CANCELLABLE = ["PENDING", "MANAGER_APPROVED"]

export function ExpenseHistoryTable({ claims }: { claims: ExpenseClaimRow[] }) {
  const router = useRouter()
  const [cancelTarget, setCancelTarget] = useState<ExpenseClaimRow | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [viewTargetId, setViewTargetId] = useState<string | null>(null)

  async function handleCancelConfirm() {
    if (!cancelTarget) return
    setIsCancelling(true)
    try {
      const result = await apiFetch(`/api/expenses/${cancelTarget.id}/cancel`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Expense claim cancelled")
      setCancelTarget(null)
      router.refresh()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No expense claims yet.
              </TableCell>
            </TableRow>
          ) : (
            claims.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.title}</TableCell>
                <TableCell>{EXPENSE_CATEGORY_LABELS[c.category]}</TableCell>
                <TableCell>{format(new Date(c.expenseDate), "dd MMM yyyy")}</TableCell>
                <TableCell>{c.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge className={EXPENSE_STATUS_BADGE_CLASSES[c.status]}>{EXPENSE_STATUS_LABELS[c.status]}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setViewTargetId(c.id)}>
                      <Eye />
                    </Button>
                    {c.receiptName && (
                      <Button variant="ghost" size="icon-sm" asChild>
                        <a href={`/api/expenses/${c.id}/receipt`} download>
                          <Download />
                        </a>
                      </Button>
                    )}
                    {CANCELLABLE.includes(c.status) && (
                      <Button variant="ghost" size="sm" onClick={() => setCancelTarget(c)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel expense claim?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && <>This will cancel your &quot;{cancelTarget.title}&quot; claim.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={isCancelling}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isCancelling && <Loader2 className="animate-spin" />}
              Cancel claim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExpenseDetailDialog claimId={viewTargetId} onOpenChange={(open) => !open && setViewTargetId(null)} />
    </div>
  )
}
