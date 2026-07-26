"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Loader2, MoreHorizontal, Pencil, Target, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
import { GoalFormDialog, type GoalEditTarget } from "@/features/performance/components/goal-form-dialog"
import { GOAL_STATUS_BADGE } from "@/features/performance/lib/status-labels"

type Goal = {
  id: string
  title: string
  description: string | null
  startDate: string
  dueDate: string
  status: string
  progress: number
}

export function GoalsPanel({ employeeId, canManage }: { employeeId: string; canManage: boolean }) {
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<GoalEditTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function load() {
    const result = await apiFetch<{ goals: Goal[] }>(`/api/performance/goals?employeeId=${employeeId}`)
    if (result.success) setGoals(result.data.goals)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  function openEdit(goal: Goal) {
    setEditTarget(goal)
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
      const result = await apiFetch(`/api/performance/goals/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Goal deleted")
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
          <CardTitle>Goals</CardTitle>
          <CardDescription>Specific, time-bound objectives.</CardDescription>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            Add Goal
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!goals ? (
          <Skeleton className="h-32 w-full" />
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Target className="size-8 opacity-50" />
            <p className="text-sm">No goals yet</p>
          </div>
        ) : (
          goals.map((g) => (
            <div key={g.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{g.title}</p>
                    <Badge className={GOAL_STATUS_BADGE[g.status]}>{g.status.replace("_", " ")}</Badge>
                  </div>
                  {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(g.startDate), "dd MMM yyyy")} – {format(new Date(g.dueDate), "dd MMM yyyy")}
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
                      <DropdownMenuItem onClick={() => openEdit(g)}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(g)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Progress value={g.progress} className="flex-1" />
                <span className="text-xs text-muted-foreground">{g.progress}%</span>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <GoalFormDialog employeeId={employeeId} target={editTarget} open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete goal?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && <>This will remove &quot;{deleteTarget.title}&quot;.</>}
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
