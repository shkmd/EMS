"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DepartmentFormDialog,
  type DepartmentEditTarget,
} from "@/features/departments/components/department-form-dialog"

export type DepartmentRow = {
  id: string
  name: string
  description: string | null
  head: { id: string; firstName: string; lastName: string } | null
  _count: { employees: number; designations: number }
}

export function DepartmentsClient({
  departments,
  employees,
  canManage,
}: {
  departments: DepartmentRow[]
  employees: { id: string; label: string }[]
  canManage: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DepartmentEditTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<DepartmentRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return departments
    const q = search.toLowerCase()
    return departments.filter((d) => d.name.toLowerCase().includes(q))
  }, [departments, search])

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(dept: DepartmentRow) {
    setEditTarget({ id: dept.id, name: dept.name, description: dept.description, head: dept.head })
    setFormOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/departments/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Department deleted")
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
      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        {canManage && (
          <Button className="ml-auto" onClick={openCreate}>
            <Plus /> Add Department
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Head</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Designations</TableHead>
              {canManage && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5} className="h-32 text-center text-muted-foreground">
                  No departments found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {dept.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    {dept.head ? `${dept.head.firstName} ${dept.head.lastName}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      <Users /> {dept._count.employees}
                    </Badge>
                  </TableCell>
                  <TableCell>{dept._count.designations}</TableCell>
                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(dept)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(dept)}>
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

      <DepartmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        target={editTarget}
        employees={employees}
        onSaved={() => router.refresh()}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  This will delete <strong>{deleteTarget.name}</strong>.{" "}
                  {deleteTarget._count.employees > 0 &&
                    `${deleteTarget._count.employees} employee(s) will be unassigned from this department. `}
                  {deleteTarget._count.designations > 0 &&
                    `${deleteTarget._count.designations} designation(s) will become unassigned. `}
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
