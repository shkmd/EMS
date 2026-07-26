"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Banknote, Check, Download, Eye, Loader2, X } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

type ApprovalRow = {
  id: string
  category: ExpenseCategory
  title: string
  amount: string
  expenseDate: string
  status: ExpenseClaimStatus
  receiptName: string | null
  employee: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null }
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

export function ExpenseApprovalsTable({ scope, actionType }: { scope: string; actionType: "hr" | "manager" }) {
  function actionEndpoint(id: string) {
    return actionType === "hr" ? `/api/expenses/${id}/hr-action` : `/api/expenses/${id}/manager-action`
  }

  const [claims, setClaims] = useState<ApprovalRow[] | null>(null)
  const [actionTarget, setActionTarget] = useState<{ claim: ApprovalRow; action: "APPROVE" | "REJECT" } | null>(null)
  const [reimburseTarget, setReimburseTarget] = useState<ApprovalRow | null>(null)
  const [viewTargetId, setViewTargetId] = useState<string | null>(null)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function load() {
    const result = await apiFetch<{ claims: ApprovalRow[] }>(`/api/expenses?scope=${scope}`)
    if (result.success) setClaims(result.data.claims)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  async function handleConfirm() {
    if (!actionTarget) return
    setIsSubmitting(true)
    try {
      const result = await apiFetch(actionEndpoint(actionTarget.claim.id), {
        method: "POST",
        body: { action: actionTarget.action, comment },
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(actionTarget.action === "APPROVE" ? "Claim approved" : "Claim rejected")
      setActionTarget(null)
      setComment("")
      load()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleReimburseConfirm() {
    if (!reimburseTarget) return
    setIsSubmitting(true)
    try {
      const result = await apiFetch(`/api/expenses/${reimburseTarget.id}/reimburse`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Claim marked as reimbursed")
      setReimburseTarget(null)
      load()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {!claims ? (
          <Skeleton className="h-48 w-full" />
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
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Nothing awaiting your action.
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
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon-sm" asChild>
                              <a
                                href={`/api/expenses/${c.id}/receipt?disposition=inline`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Eye />
                              </a>
                            </Button>
                            <Button variant="ghost" size="icon-sm" asChild>
                              <a href={`/api/expenses/${c.id}/receipt`} download>
                                <Download />
                              </a>
                            </Button>
                          </div>
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
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => setViewTargetId(c.id)}>
                            <Eye />
                          </Button>
                          {c.status === "APPROVED" ? (
                            actionType === "hr" && (
                              <Button variant="outline" size="sm" onClick={() => setReimburseTarget(c)}>
                                <Banknote /> Reimburse
                              </Button>
                            )
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="icon-sm"
                                onClick={() => setActionTarget({ claim: c, action: "APPROVE" })}
                              >
                                <Check className="text-emerald-600" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon-sm"
                                onClick={() => setActionTarget({ claim: c, action: "REJECT" })}
                              >
                                <X className="text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!actionTarget} onOpenChange={(open) => !open && setActionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionTarget?.action === "APPROVE" ? "Approve" : "Reject"} expense claim</DialogTitle>
            <DialogDescription>
              {actionTarget && (
                <>
                  {actionTarget.claim.employee.firstName} {actionTarget.claim.employee.lastName}&apos;s{" "}
                  {actionTarget.claim.title} claim ({Number(actionTarget.claim.amount).toFixed(2)}).
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Optional comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Confirm {actionTarget?.action === "APPROVE" ? "approval" : "rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!reimburseTarget} onOpenChange={(open) => !open && setReimburseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as reimbursed?</AlertDialogTitle>
            <AlertDialogDescription>
              {reimburseTarget && (
                <>
                  This confirms {reimburseTarget.employee.firstName} {reimburseTarget.employee.lastName} has been paid{" "}
                  {Number(reimburseTarget.amount).toFixed(2)} for &quot;{reimburseTarget.title}&quot;.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReimburseConfirm} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Confirm reimbursement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExpenseDetailDialog claimId={viewTargetId} onOpenChange={(open) => !open && setViewTargetId(null)} />
    </Card>
  )
}
