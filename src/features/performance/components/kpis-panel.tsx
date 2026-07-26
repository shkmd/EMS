"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Gauge, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
import { KpiFormDialog, type KpiEditTarget } from "@/features/performance/components/kpi-form-dialog"

type Kpi = {
  id: string
  name: string
  description: string | null
  targetValue: string
  achievedValue: string
  unit: string | null
  period: string
}

export function KpisPanel({ employeeId, canManage }: { employeeId: string; canManage: boolean }) {
  const [kpis, setKpis] = useState<Kpi[] | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<KpiEditTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<Kpi | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function load() {
    const result = await apiFetch<{ kpis: Kpi[] }>(`/api/performance/kpis?employeeId=${employeeId}`)
    if (result.success) setKpis(result.data.kpis)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  function openEdit(kpi: Kpi) {
    setEditTarget(kpi)
    setFormOpen(true)
  }

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/performance/kpis/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("KPI deleted")
      setDeleteTarget(null)
      load()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>KPIs</CardTitle>
          <CardDescription>Measurable targets by period.</CardDescription>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <Plus /> Add KPI
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!kpis ? (
          <Skeleton className="h-32 w-full" />
        ) : kpis.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Gauge className="size-8 opacity-50" />
            <p className="text-sm">No KPIs yet</p>
          </div>
        ) : (
          kpis.map((k) => {
            const target = Number(k.targetValue)
            const achieved = Number(k.achievedValue)
            const pct = target !== 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0
            return (
              <div key={k.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{k.name}</p>
                    {k.description && <p className="text-sm text-muted-foreground">{k.description}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {achieved}
                      {k.unit ?? ""} / {target}
                      {k.unit ?? ""} — {k.period}
                    </p>
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(k)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(k)}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={pct} className="flex-1" />
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                </div>
              </div>
            )
          })
        )}
      </CardContent>

      <KpiFormDialog employeeId={employeeId} target={editTarget} open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete KPI?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && <>This will remove &quot;{deleteTarget.name}&quot;.</>}
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
