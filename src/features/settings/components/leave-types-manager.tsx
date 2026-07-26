"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { LeaveTypeFormDialog, type LeaveTypeEditTarget } from "@/features/settings/components/leave-type-form-dialog"

type LeaveType = {
  id: string
  name: string
  code: string
  defaultDaysPerYear: number
  isPaid: boolean
  carryForward: boolean
  maxCarryForwardDays: number | null
}

export function LeaveTypesManager() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[] | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LeaveTypeEditTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function load() {
    const result = await apiFetch<{ leaveTypes: LeaveType[] }>("/api/settings/leave-types")
    if (result.success) setLeaveTypes(result.data.leaveTypes)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(lt: LeaveType) {
    setEditTarget(lt)
    setFormOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/settings/leave-types/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Leave type deleted")
      setDeleteTarget(null)
      load()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Leave Rules</CardTitle>
          <CardDescription>Leave types and the yearly allocation new balances are seeded with.</CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add Leave Type
        </Button>
      </CardHeader>
      <CardContent>
        {!leaveTypes ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Days/Year</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Carry Forward</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No leave types yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  leaveTypes.map((lt) => (
                    <TableRow key={lt.id}>
                      <TableCell className="font-medium">{lt.name}</TableCell>
                      <TableCell>{lt.code}</TableCell>
                      <TableCell>{lt.defaultDaysPerYear}</TableCell>
                      <TableCell>
                        <Badge variant={lt.isPaid ? "default" : "outline"}>{lt.isPaid ? "Paid" : "Unpaid"}</Badge>
                      </TableCell>
                      <TableCell>{lt.carryForward ? `Up to ${lt.maxCarryForwardDays ?? "∞"} days` : "—"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(lt)}>
                              <Pencil /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(lt)}>
                              <Trash2 /> Delete
                            </DropdownMenuItem>
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
      </CardContent>

      <LeaveTypeFormDialog target={editTarget} open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete leave type?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && <>This will remove &quot;{deleteTarget.name}&quot;. Types with existing leave requests can&apos;t be deleted.</>}
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
    </Card>
  )
}
