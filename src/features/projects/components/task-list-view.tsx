"use client"

import { useEffect, useState } from "react"
import { format, isBefore, startOfToday } from "date-fns"
import { toast } from "sonner"
import { MoreHorizontal, Plus } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"
import { initials } from "@/features/messaging/lib/initials"
import { TaskFormDialog } from "@/features/projects/components/task-form-dialog"
import { TaskDetailDialog } from "@/features/projects/components/task-detail-dialog"
import {
  TASK_PRIORITY_BADGE,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_BADGE,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
} from "@/features/projects/lib/labels"
import type { AssigneeRef, TaskItem } from "@/features/projects/lib/types"

export function TaskListView({
  projectId,
  initialTasks,
  assignableEmployees,
  canManage,
  currentEmployeeId,
  currentUserId,
  initialOpenTaskId,
}: {
  projectId: string
  initialTasks: TaskItem[]
  assignableEmployees: AssigneeRef[]
  canManage: boolean
  currentEmployeeId: string | null
  currentUserId: string
  initialOpenTaskId?: string
}) {
  const [tasks, setTasks] = useState(initialTasks)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TaskItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TaskItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [detailTarget, setDetailTarget] = useState<TaskItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const today = startOfToday()

  useEffect(() => {
    if (!initialOpenTaskId) return
    const match = initialTasks.find((t) => t.id === initialOpenTaskId)
    if (match) {
      setDetailTarget(match)
      setDetailOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refresh() {
    const result = await apiFetch<{ tasks: TaskItem[] }>(`/api/projects/${projectId}/tasks`)
    if (result.success) {
      setTasks(result.data.tasks)
      if (detailTarget) {
        const updated = result.data.tasks.find((t) => t.id === detailTarget.id)
        if (updated) setDetailTarget(updated)
      }
    }
  }

  function canChangeStatus(task: TaskItem) {
    return canManage || (currentEmployeeId !== null && task.assignees.some((a) => a.id === currentEmployeeId))
  }

  async function handleStatusChange(task: TaskItem, status: string) {
    const previous = tasks
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)))
    const result = await apiFetch(`/api/projects/${projectId}/tasks/${task.id}/status`, {
      method: "PATCH",
      body: { status },
    })
    if (!result.success) {
      setTasks(previous)
      toast.error(result.error.message)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    const result = await apiFetch(`/api/projects/${projectId}/tasks/${deleteTarget.id}`, { method: "DELETE" })
    setIsDeleting(false)
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    toast.success("Task deleted")
    setDeleteTarget(null)
    refresh()
  }

  const grouped = TASK_STATUS_ORDER.map((status) => ({
    status,
    tasks: tasks.filter((t) => t.status === status),
  })).filter((g) => g.tasks.length > 0)

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditTarget(null)
              setDialogOpen(true)
            }}
          >
            <Plus /> New Task
          </Button>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="rounded-lg border py-16 text-center text-sm text-muted-foreground">
          No tasks yet in this project.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map((group) => (
            <div key={group.status} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <Badge className={cn(TASK_STATUS_BADGE[group.status])}>{TASK_STATUS_LABEL[group.status]}</Badge>
                <span className="text-xs text-muted-foreground">{group.tasks.length}</span>
              </div>
              <div className="overflow-hidden rounded-lg border">
                {group.tasks.map((task, idx) => {
                  const overdue = task.dueDate && task.status !== "DONE" && isBefore(new Date(task.dueDate), today)
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex flex-wrap items-center gap-3 px-3 py-2.5",
                        idx > 0 && "border-t",
                        "hover:bg-accent/30"
                      )}
                    >
                      <button
                        className="min-w-40 flex-1 cursor-pointer text-left"
                        onClick={() => {
                          setDetailTarget(task)
                          setDetailOpen(true)
                        }}
                      >
                        <p className="truncate text-sm font-medium hover:underline">{task.title}</p>
                      </button>

                      <div className="flex -space-x-2">
                        {task.assignees.map((a) => (
                          <Avatar key={a.id} className="size-6 border-2 border-background">
                            {a.profilePhotoUrl && <AvatarImage src={`/api/employees/${a.id}/photo`} />}
                            <AvatarFallback className="text-[10px]">{initials(a.name)}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>

                      {task.dueDate && (
                        <span className={cn("text-xs", overdue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                          {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      )}

                      <Badge className={cn(TASK_PRIORITY_BADGE[task.priority])}>{TASK_PRIORITY_LABEL[task.priority]}</Badge>

                      {canChangeStatus(task) ? (
                        <Select value={task.status} onValueChange={(status) => handleStatusChange(task, status)}>
                          <SelectTrigger size="sm" className="w-38">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TASK_STATUS_ORDER.map((s) => (
                              <SelectItem key={s} value={s}>
                                {TASK_STATUS_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="w-38 text-xs text-muted-foreground">{TASK_STATUS_LABEL[task.status]}</span>
                      )}

                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditTarget(task)
                                setDialogOpen(true)
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(task)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskFormDialog
        projectId={projectId}
        target={editTarget}
        assignableEmployees={assignableEmployees}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={refresh}
      />

      <TaskDetailDialog
        projectId={projectId}
        task={detailTarget}
        assignableEmployees={assignableEmployees}
        canManage={canManage}
        currentEmployeeId={currentEmployeeId}
        currentUserId={currentUserId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onTaskSaved={refresh}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.title}</strong>. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
