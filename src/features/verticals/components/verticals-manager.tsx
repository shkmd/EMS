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
import { VerticalFormDialog, type VerticalEditTarget } from "@/features/verticals/components/vertical-form-dialog"

type Vertical = {
  id: string
  name: string
  startTime: string
  endTime: string
  workingDays: string[]
  graceMinutes: number
  halfDayHours: number
  fullDayHours: number
  managers: { id: string; firstName: string; lastName: string }[]
  _count: { employees: number }
}

function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number)
  const period = h! >= 12 ? "PM" : "AM"
  const hour12 = h! % 12 === 0 ? 12 : h! % 12
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`
}

export function VerticalsManager() {
  const [verticals, setVerticals] = useState<Vertical[] | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<VerticalEditTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vertical | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function load() {
    const result = await apiFetch<{ verticals: Vertical[] }>("/api/settings/verticals")
    if (result.success) setVerticals(result.data.verticals)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(v: Vertical) {
    setEditTarget(v)
    setFormOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/settings/verticals/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Vertical deleted")
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
          <CardTitle>Verticals</CardTitle>
          <CardDescription>Business units with their own working hours (e.g. Amarc, Athachi Group).</CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add Vertical
        </Button>
      </CardHeader>
      <CardContent>
        {!verticals ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Managers</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {verticals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No verticals yet — everyone uses the default working hours below.
                    </TableCell>
                  </TableRow>
                ) : (
                  verticals.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>
                        {formatTime(v.startTime)} – {formatTime(v.endTime)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {v.workingDays.map((d) => (
                            <Badge key={d} variant="outline">
                              {d}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {v.managers.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {v.managers.map((m) => (
                              <Badge key={m.id} variant="outline">
                                {m.firstName} {m.lastName}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{v._count.employees}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(v)}>
                              <Pencil /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(v)}>
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

      <VerticalFormDialog target={editTarget} open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vertical?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && <>This will remove &quot;{deleteTarget.name}&quot;. Verticals with employees assigned can&apos;t be deleted.</>}
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
