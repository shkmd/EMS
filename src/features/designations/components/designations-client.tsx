"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  DesignationFormDialog,
  type DesignationEditTarget,
} from "@/features/designations/components/designation-form-dialog"

const ALL = "__all__"

export type DesignationRow = {
  id: string
  title: string
  description: string | null
  department: { id: string; name: string } | null
  _count: { employees: number }
}

export function DesignationsClient({
  designations,
  departments,
  canManage,
}: {
  designations: DesignationRow[]
  departments: { id: string; name: string }[]
  canManage: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState(ALL)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DesignationEditTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<DesignationRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filtered = useMemo(() => {
    return designations.filter((d) => {
      const matchesSearch = !search.trim() || d.title.toLowerCase().includes(search.toLowerCase())
      const matchesDept = departmentFilter === ALL || d.department?.id === departmentFilter
      return matchesSearch && matchesDept
    })
  }, [designations, search, departmentFilter])

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(designation: DesignationRow) {
    setEditTarget({
      id: designation.id,
      title: designation.title,
      description: designation.description,
      department: designation.department,
    })
    setFormOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/designations/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Designation deleted")
      setDeleteTarget(null)
      router.refresh()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search designations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canManage && (
          <Button className="ml-auto" onClick={openCreate}>
            <Plus /> Add Designation
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Employees</TableHead>
              {canManage && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="h-32 text-center text-muted-foreground">
                  No designations found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((designation) => (
                <TableRow key={designation.id}>
                  <TableCell className="font-medium">{designation.title}</TableCell>
                  <TableCell>{designation.department?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {designation.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      <Users /> {designation._count.employees}
                    </Badge>
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
                          <DropdownMenuItem onClick={() => openEdit(designation)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(designation)}>
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

      <DesignationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        target={editTarget}
        departments={departments}
        onSaved={() => router.refresh()}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete designation?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  This will delete <strong>{deleteTarget.title}</strong>.{" "}
                  {deleteTarget._count.employees > 0 &&
                    `${deleteTarget._count.employees} employee(s) will be unassigned from this designation. `}
                  This cannot be undone.
                </>
              )}
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
