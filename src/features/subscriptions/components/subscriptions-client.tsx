"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format, differenceInCalendarDays } from "date-fns"
import { toast } from "sonner"
import { Loader2, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
  SubscriptionFormDialog,
  type SubscriptionEditTarget,
} from "@/features/subscriptions/components/subscription-form-dialog"

export type SubscriptionRow = {
  id: string
  name: string
  vendor: string | null
  category: string | null
  cost: number | null
  billingCycle: string
  startDate: string | null
  endDate: string
  notifyEmployeeId: string | null
  notifyEmployee: { id: string; firstName: string; lastName: string } | null
  notes: string | null
  status: string
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CANCELLED: "bg-muted text-muted-foreground",
}

function expiryBadge(endDate: string, status: string) {
  if (status !== "ACTIVE") return null
  const days = differenceInCalendarDays(new Date(endDate), new Date())
  if (days < 0) return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400">Expired</Badge>
  if (days <= 7) return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">Renews in {days}d</Badge>
  return null
}

export function SubscriptionsClient({ subscriptions, canManage }: { subscriptions: SubscriptionRow[]; canManage: boolean }) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SubscriptionEditTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  const sorted = useMemo(
    () => [...subscriptions].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()),
    [subscriptions]
  )

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(sub: SubscriptionRow) {
    setEditTarget(sub)
    setFormOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/subscriptions/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Subscription deleted")
      setDeleteTarget(null)
      router.refresh()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleCheckNow() {
    setIsChecking(true)
    try {
      const result = await apiFetch<{ subscriptionsChecked: number; notificationsSent: number }>(
        "/api/subscriptions/check-reminders",
        { method: "POST" }
      )
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(
        result.data.subscriptionsChecked === 0
          ? "No subscriptions are renewing in exactly 7 days right now"
          : `Sent reminders for ${result.data.subscriptionsChecked} subscription(s)`
      )
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openCreate}>
            <Plus /> Add Subscription
          </Button>
          <Button variant="outline" onClick={handleCheckNow} disabled={isChecking} title="Runs the same 7-day-before check the daily scheduler runs">
            {isChecking ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Check reminders now
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Renews / Ends</TableHead>
              <TableHead>Notify</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 9 : 8} className="h-32 text-center text-muted-foreground">
                  No subscriptions tracked yet.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.vendor ?? "—"}</TableCell>
                  <TableCell>{s.category ?? "—"}</TableCell>
                  <TableCell>{s.cost != null ? s.cost.toLocaleString() : "—"}</TableCell>
                  <TableCell>{s.billingCycle.replace("_", "-").toLowerCase()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {format(new Date(s.endDate), "dd MMM yyyy")}
                      {expiryBadge(s.endDate, s.status)}
                    </div>
                  </TableCell>
                  <TableCell>{s.notifyEmployee ? `${s.notifyEmployee.firstName} ${s.notifyEmployee.lastName}` : "Admin/HR"}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE[s.status]}>{s.status === "ACTIVE" ? "Active" : "Cancelled"}</Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(s)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(s)}>
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {canManage && (
        <SubscriptionFormDialog open={formOpen} onOpenChange={setFormOpen} target={editTarget} onSaved={() => router.refresh()} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && <>This will remove &quot;{deleteTarget.name}&quot; and stop future renewal reminders for it.</>}
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
