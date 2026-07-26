"use client"

import { useEffect, useState } from "react"
import { format, isSameDay } from "date-fns"
import { toast } from "sonner"
import { Check, Loader2, X } from "lucide-react"

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
import { apiFetch } from "@/lib/api-client"
import { LEAVE_STATUS_BADGE, LEAVE_STATUS_LABELS } from "@/features/leave/lib/status-labels"

type ApprovalRow = {
  id: string
  startDate: string
  endDate: string
  days: number
  reason: string
  status: string
  leaveType: { name: string }
  employee: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null }
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

export function LeaveApprovalsTable({ scope, actionType }: { scope: string; actionType: "hr" | "manager" }) {
  function actionEndpoint(id: string) {
    return actionType === "hr" ? `/api/leave/${id}/hr-action` : `/api/leave/${id}/manager-action`
  }

  const [requests, setRequests] = useState<ApprovalRow[] | null>(null)
  const [actionTarget, setActionTarget] = useState<{ request: ApprovalRow; action: "APPROVE" | "REJECT" } | null>(null)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function load() {
    const result = await apiFetch<{ requests: ApprovalRow[] }>(`/api/leave?scope=${scope}`)
    if (result.success) setRequests(result.data.requests)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  async function handleConfirm() {
    if (!actionTarget) return
    setIsSubmitting(true)
    try {
      const result = await apiFetch(actionEndpoint(actionTarget.request.id), {
        method: "POST",
        body: { action: actionTarget.action, comment },
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(actionTarget.action === "APPROVE" ? "Request approved" : "Request rejected")
      setActionTarget(null)
      setComment("")
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
        {!requests ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Nothing awaiting your approval.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            {r.employee.profilePhotoUrl && (
                              <AvatarImage src={`/api/employees/${r.employee.id}/photo`} />
                            )}
                            <AvatarFallback className="text-xs">
                              {initials(r.employee.firstName, r.employee.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {r.employee.firstName} {r.employee.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{r.leaveType.name}</TableCell>
                      <TableCell>
                        {format(new Date(r.startDate), "dd MMM")}
                        {!isSameDay(new Date(r.startDate), new Date(r.endDate)) &&
                          ` – ${format(new Date(r.endDate), "dd MMM yyyy")}`}
                      </TableCell>
                      <TableCell>{r.days}</TableCell>
                      <TableCell>
                        <Badge className={LEAVE_STATUS_BADGE[r.status]}>
                          {LEAVE_STATUS_LABELS[r.status] ?? r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{r.reason}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => setActionTarget({ request: r, action: "APPROVE" })}
                          >
                            <Check className="text-emerald-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => setActionTarget({ request: r, action: "REJECT" })}
                          >
                            <X className="text-destructive" />
                          </Button>
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
            <DialogTitle>{actionTarget?.action === "APPROVE" ? "Approve" : "Reject"} leave request</DialogTitle>
            <DialogDescription>
              {actionTarget && (
                <>
                  {actionTarget.request.employee.firstName} {actionTarget.request.employee.lastName}&apos;s{" "}
                  {actionTarget.request.leaveType.name} request ({actionTarget.request.days} day(s)).
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
    </Card>
  )
}
