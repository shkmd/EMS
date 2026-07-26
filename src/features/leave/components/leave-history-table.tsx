"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format, isSameDay } from "date-fns"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

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
import { LEAVE_STATUS_BADGE, LEAVE_STATUS_LABELS } from "@/features/leave/lib/status-labels"

export type LeaveRequestRow = {
  id: string
  startDate: Date | string
  endDate: Date | string
  days: number
  duration: string
  reason: string
  status: string
  leaveType: { name: string }
}

const CANCELLABLE = ["PENDING", "MANAGER_APPROVED", "APPROVED"]

export function LeaveHistoryTable({ requests }: { requests: LeaveRequestRow[] }) {
  const router = useRouter()
  const [cancelTarget, setCancelTarget] = useState<LeaveRequestRow | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  async function handleCancelConfirm() {
    if (!cancelTarget) return
    setIsCancelling(true)
    try {
      const result = await apiFetch(`/api/leave/${cancelTarget.id}/cancel`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Leave request cancelled")
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
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No leave requests yet.
              </TableCell>
            </TableRow>
          ) : (
            requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.leaveType.name}</TableCell>
                <TableCell>
                  {format(new Date(r.startDate), "dd MMM yyyy")}
                  {!isSameDay(new Date(r.startDate), new Date(r.endDate)) &&
                    ` – ${format(new Date(r.endDate), "dd MMM yyyy")}`}
                </TableCell>
                <TableCell>{r.days}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{r.reason}</TableCell>
                <TableCell>
                  <Badge className={LEAVE_STATUS_BADGE[r.status]}>{LEAVE_STATUS_LABELS[r.status] ?? r.status}</Badge>
                </TableCell>
                <TableCell>
                  {CANCELLABLE.includes(r.status) && (
                    <Button variant="ghost" size="sm" onClick={() => setCancelTarget(r)}>
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel leave request?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && (
                <>
                  This will cancel your {cancelTarget.leaveType.name} request for{" "}
                  {format(new Date(cancelTarget.startDate), "dd MMM yyyy")}
                  {!isSameDay(new Date(cancelTarget.startDate), new Date(cancelTarget.endDate)) &&
                    ` – ${format(new Date(cancelTarget.endDate), "dd MMM yyyy")}`}
                  . If it was already approved, the days will be credited back to your balance.
                </>
              )}
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
              Cancel request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
