"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
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
import { PERMISSION_STATUS_BADGE, PERMISSION_STATUS_LABELS } from "@/features/permission/lib/status-labels"

export type PermissionRequestRow = {
  id: string
  date: Date | string
  hours: number
  reason: string
  status: string
}

const CANCELLABLE = ["PENDING", "MANAGER_APPROVED", "APPROVED"]

export function PermissionHistoryTable({ requests }: { requests: PermissionRequestRow[] }) {
  const router = useRouter()
  const [cancelTarget, setCancelTarget] = useState<PermissionRequestRow | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  async function handleCancelConfirm() {
    if (!cancelTarget) return
    setIsCancelling(true)
    try {
      const result = await apiFetch(`/api/permission/${cancelTarget.id}/cancel`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Permission request cancelled")
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
            <TableHead>Date</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No permission requests yet.
              </TableCell>
            </TableRow>
          ) : (
            requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{format(new Date(r.date), "dd MMM yyyy")}</TableCell>
                <TableCell>{r.hours}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{r.reason}</TableCell>
                <TableCell>
                  <Badge className={PERMISSION_STATUS_BADGE[r.status]}>{PERMISSION_STATUS_LABELS[r.status] ?? r.status}</Badge>
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
            <AlertDialogTitle>Cancel permission request?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && (
                <>
                  This will cancel your {cancelTarget.hours}-hour permission request for{" "}
                  {format(new Date(cancelTarget.date), "dd MMM yyyy")}.
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
