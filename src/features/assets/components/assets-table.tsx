"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, MoreHorizontal, Pencil, Search, Trash2, Undo2, UserPlus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { AssetFormDialog, type AssetEditTarget } from "@/features/assets/components/asset-form-dialog"
import { AssignAssetDialog } from "@/features/assets/components/assign-asset-dialog"
import { ReturnAssetDialog } from "@/features/assets/components/return-asset-dialog"
import { ASSET_CATEGORY_LABELS, ASSET_STATUS_BADGE } from "@/features/assets/lib/labels"
import { assetCategoryValues, assetStatusValues } from "@/features/assets/schemas"

const ALL = "__all__"

type AssetRow = {
  id: string
  assetTag: string
  category: string
  name: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  purchaseDate: string | null
  purchaseCost: string | null
  status: string
  currentAssignment: { id: string; employee: { id: string; firstName: string; lastName: string } } | null
}

export function AssetsTable() {
  const [category, setCategory] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [search, setSearch] = useState("")
  const [assets, setAssets] = useState<AssetRow[] | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AssetEditTarget>(null)
  const [assignTarget, setAssignTarget] = useState<string | null>(null)
  const [returnTarget, setReturnTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AssetRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function load() {
    const params = new URLSearchParams()
    if (category !== ALL) params.set("category", category)
    if (status !== ALL) params.set("status", status)
    if (search) params.set("search", search)

    const result = await apiFetch<{ assets: AssetRow[] }>(`/api/assets?${params}`)
    if (result.success) setAssets(result.data.assets)
  }

  useEffect(() => {
    const timeout = setTimeout(load, search ? 350 : 0)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, status, search])

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(asset: AssetRow) {
    setEditTarget(asset)
    setFormOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/assets/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Asset deleted")
      setDeleteTarget(null)
      load()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {assetCategoryValues.map((c) => (
              <SelectItem key={c} value={c}>
                {ASSET_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {assetStatusValues.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="ml-auto" onClick={openCreate}>
          Add Asset
        </Button>
      </div>

      {!assets ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No assets found.
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.assetTag}</TableCell>
                    <TableCell>{ASSET_CATEGORY_LABELS[a.category] ?? a.category}</TableCell>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>
                      <Badge className={ASSET_STATUS_BADGE[a.status]}>{a.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      {a.currentAssignment
                        ? `${a.currentAssignment.employee.firstName} ${a.currentAssignment.employee.lastName}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(a)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          {a.status === "AVAILABLE" && (
                            <DropdownMenuItem onClick={() => setAssignTarget(a.id)}>
                              <UserPlus /> Assign
                            </DropdownMenuItem>
                          )}
                          {a.status === "ASSIGNED" && a.currentAssignment && (
                            <DropdownMenuItem onClick={() => setReturnTarget(a.currentAssignment!.id)}>
                              <Undo2 /> Return
                            </DropdownMenuItem>
                          )}
                          {a.status !== "ASSIGNED" && (
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(a)}>
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          )}
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

      <AssetFormDialog target={editTarget} open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
      <AssignAssetDialog assetId={assignTarget} open={!!assignTarget} onOpenChange={(open) => !open && setAssignTarget(null)} onSaved={load} />
      <ReturnAssetDialog
        assignmentId={returnTarget}
        open={!!returnTarget}
        onOpenChange={(open) => !open && setReturnTarget(null)}
        onSaved={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && <>This will remove &quot;{deleteTarget.assetTag}&quot; from the inventory.</>}
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
