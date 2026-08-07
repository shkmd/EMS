"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { TASK_STATUS_LABEL, TASK_STATUS_ORDER, TASK_PRIORITY_LABEL, TASK_PRIORITY_BADGE } from "@/features/projects/lib/labels"

type MyTask = {
  id: string
  projectId: string
  projectName: string
  projectColor: string
  title: string
  status: string
  priority: string
  dueDate: string | null
}

export function MyTasksCard() {
  const [tasks, setTasks] = useState<MyTask[] | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  function loadTasks() {
    apiFetch<{ tasks: MyTask[] }>("/api/projects/my-tasks").then((result) => {
      if (result.success) setTasks(result.data.tasks)
    })
  }

  useEffect(loadTasks, [])

  async function handleStatusChange(task: MyTask, status: string) {
    setUpdatingId(task.id)
    try {
      const result = await apiFetch(`/api/projects/${task.projectId}/tasks/${task.id}/status`, {
        method: "PATCH",
        body: { status },
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Task updated")
      loadTasks()
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Tasks</CardTitle>
        <CardDescription>Tasks assigned to you, across every project.</CardDescription>
      </CardHeader>
      <CardContent>
        {!tasks ? (
          <Skeleton className="h-32 w-full" />
        ) : tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up — no open tasks.</p>
        ) : (
          <div className="flex flex-col divide-y">
            {tasks.map((task) => (
              <div key={task.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: task.projectColor }} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/projects/${task.projectId}?task=${task.id}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {task.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{task.projectName}</span>
                    {task.dueDate && <span>· Due {format(new Date(task.dueDate), "dd MMM")}</span>}
                  </div>
                </div>
                <Badge className={cn("shrink-0", TASK_PRIORITY_BADGE[task.priority])}>
                  {TASK_PRIORITY_LABEL[task.priority] ?? task.priority}
                </Badge>
                <Select
                  value={task.status}
                  onValueChange={(status) => handleStatusChange(task, status)}
                  disabled={updatingId === task.id}
                >
                  <SelectTrigger className="h-8 w-36 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUS_ORDER.map((status) => (
                      <SelectItem key={status} value={status}>
                        {TASK_STATUS_LABEL[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
