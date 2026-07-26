"use client"

import { useMemo, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { HolidayFormDialog, type HolidayEditTarget } from "@/features/holidays/components/holiday-form-dialog"

const ALL = "__all__"

const TYPE_BADGE: Record<string, string> = {
  PUBLIC: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  COMPANY: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  OPTIONAL: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
}

export type HolidayRow = {
  id: string
  name: string
  date: string
  type: string
  description: string | null
}

export function HolidaysClient({
  holidays,
  year,
  canManage,
}: {
  holidays: HolidayRow[]
  year: number
  canManage: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [typeFilter, setTypeFilter] = useState(ALL)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HolidayEditTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<HolidayRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filtered = useMemo(
    () => (typeFilter === ALL ? holidays : holidays.filter((h) => h.type === typeFilter)),
    [holidays, typeFilter]
  )

  function changeYear(nextYear: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("year", nextYear)
    router.push(`${pathname}?${params.toString()}`)
  }

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(holiday: HolidayRow) {
    setEditTarget(holiday)
    setFormOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/holidays/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Holiday deleted")
      setDeleteTarget(null)
      router.refresh()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => year - 2 + i)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(year)} onValueChange={changeYear}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            <SelectItem value="PUBLIC">Public</SelectItem>
            <SelectItem value="COMPANY">Company</SelectItem>
            <SelectItem value="OPTIONAL">Optional</SelectItem>
          </SelectContent>
        </Select>
        {canManage && (
          <Button className="ml-auto" onClick={openCreate}>
            <Plus /> Add Holiday
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              {canManage && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="h-32 text-center text-muted-foreground">
                  No holidays found for {year}.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{format(new Date(h.date), "dd MMM yyyy (EEE)")}</TableCell>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell>
                    <Badge className={TYPE_BADGE[h.type]}>{h.type}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{h.description ?? "—"}</TableCell>
                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(h)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(h)}>
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

      <HolidayFormDialog open={formOpen} onOpenChange={setFormOpen} target={editTarget} onSaved={() => router.refresh()} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete holiday?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && <>This will remove &quot;{deleteTarget.name}&quot; from the holiday calendar.</>}
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
