"use client"

import { useState } from "react"
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isToday,
  isWeekend,
  startOfMonth,
} from "date-fns"
import { Plus } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"
import { initials } from "@/features/messaging/lib/initials"
import { TaskFormDialog } from "@/features/projects/components/task-form-dialog"
import { TASK_STATUS_BAR } from "@/features/projects/lib/labels"
import type { AssigneeRef, TaskItem } from "@/features/projects/lib/types"

const DAY_WIDTH = 36
const ROW_HEIGHT = 44
const HEADER_HEIGHT = 56

function effectiveStart(task: TaskItem) {
  return new Date((task.startDate ?? task.dueDate)!)
}
function effectiveEnd(task: TaskItem) {
  return new Date((task.dueDate ?? task.startDate)!)
}

export function TaskGanttView({
  projectId,
  initialTasks,
  assignableEmployees,
  canManage,
}: {
  projectId: string
  initialTasks: TaskItem[]
  assignableEmployees: AssigneeRef[]
  canManage: boolean
}) {
  const [tasks, setTasks] = useState(initialTasks)
  const [editTarget, setEditTarget] = useState<TaskItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  async function refresh() {
    const result = await apiFetch<{ tasks: TaskItem[] }>(`/api/projects/${projectId}/tasks`)
    if (result.success) setTasks(result.data.tasks)
  }

  const scheduled = tasks
    .filter((t) => t.startDate || t.dueDate)
    .sort((a, b) => effectiveStart(a).getTime() - effectiveStart(b).getTime())
  const unscheduled = tasks.filter((t) => !t.startDate && !t.dueDate)

  const today = new Date()
  const rangeStart =
    scheduled.length > 0
      ? addDays(scheduled.reduce((min, t) => (effectiveStart(t) < min ? effectiveStart(t) : min), effectiveStart(scheduled[0]!)), -3)
      : startOfMonth(today)
  const rangeEnd =
    scheduled.length > 0
      ? addDays(scheduled.reduce((max, t) => (effectiveEnd(t) > max ? effectiveEnd(t) : max), effectiveEnd(scheduled[0]!)), 3)
      : endOfMonth(today)

  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })

  const months: { label: string; span: number }[] = []
  for (const day of days) {
    const last = months[months.length - 1]
    const label = format(day, "MMMM yyyy")
    if (last && last.label === label) {
      last.span += 1
    } else {
      months.push({ label, span: 1 })
    }
  }

  return (
    <div className="flex flex-col gap-4">
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

      {scheduled.length === 0 ? (
        <div className="rounded-lg border py-16 text-center text-sm text-muted-foreground">
          No scheduled tasks yet. Add a start or due date to a task to see it on the timeline.
        </div>
      ) : (
        <div className="flex overflow-hidden rounded-lg border">
          <div className="w-56 shrink-0 border-r bg-muted/20">
            <div style={{ height: HEADER_HEIGHT }} className="border-b" />
            {scheduled.map((task) => (
              <div key={task.id} style={{ height: ROW_HEIGHT }} className="flex items-center gap-2 border-b px-3">
                <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                <div className="flex -space-x-2">
                  {task.assignees.map((a) => (
                    <Avatar key={a.id} className="size-5 border-2 border-background">
                      {a.profilePhotoUrl && <AvatarImage src={`/api/employees/${a.id}/photo`} />}
                      <AvatarFallback className="text-[9px]">{initials(a.name)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-x-auto">
            <div style={{ width: days.length * DAY_WIDTH }}>
              <div style={{ height: HEADER_HEIGHT }} className="border-b">
                <div className="flex" style={{ height: HEADER_HEIGHT / 2 }}>
                  {months.map((m, i) => (
                    <div
                      key={i}
                      style={{ width: m.span * DAY_WIDTH }}
                      className="flex items-center border-r px-2 text-xs font-medium text-muted-foreground"
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
                <div className="flex" style={{ height: HEADER_HEIGHT / 2 }}>
                  {days.map((day) => (
                    <div
                      key={day.toISOString()}
                      style={{ width: DAY_WIDTH }}
                      className={cn(
                        "flex items-center justify-center border-r text-[11px] text-muted-foreground",
                        isWeekend(day) && "bg-muted/30",
                        isToday(day) && "bg-primary/10 font-semibold text-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative" style={{ height: scheduled.length * ROW_HEIGHT }}>
                <div className="absolute inset-0 flex">
                  {days.map((day) => (
                    <div
                      key={day.toISOString()}
                      style={{ width: DAY_WIDTH }}
                      className={cn("h-full border-r", isWeekend(day) && "bg-muted/30", isToday(day) && "bg-primary/5")}
                    />
                  ))}
                </div>

                {scheduled.map((task, i) => {
                  const start = effectiveStart(task)
                  const end = effectiveEnd(task)
                  const left = differenceInCalendarDays(start, rangeStart) * DAY_WIDTH
                  const span = differenceInCalendarDays(end, start) + 1
                  return (
                    <div
                      key={task.id}
                      style={{
                        top: i * ROW_HEIGHT + 6,
                        left,
                        width: Math.max(span * DAY_WIDTH - 6, DAY_WIDTH - 6),
                        height: ROW_HEIGHT - 12,
                      }}
                      title={`${task.title} (${format(start, "MMM d")} – ${format(end, "MMM d")})`}
                      className={cn(
                        "absolute flex items-center rounded-md px-2 text-xs font-medium",
                        TASK_STATUS_BAR[task.status],
                        canManage && "cursor-pointer"
                      )}
                      onClick={
                        canManage
                          ? () => {
                              setEditTarget(task)
                              setDialogOpen(true)
                            }
                          : undefined
                      }
                    >
                      <span className="truncate">{task.title}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {unscheduled.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            Unscheduled ({unscheduled.length}) — add a start or due date to place these on the timeline
          </p>
          <div className="overflow-hidden rounded-lg border">
            {unscheduled.map((task, idx) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm",
                  idx > 0 && "border-t",
                  canManage && "cursor-pointer hover:bg-accent/30"
                )}
                onClick={
                  canManage
                    ? () => {
                        setEditTarget(task)
                        setDialogOpen(true)
                      }
                    : undefined
                }
              >
                <span className="truncate">{task.title}</span>
                <div className="flex -space-x-2">
                  {task.assignees.map((a) => (
                    <Avatar key={a.id} className="size-6 border-2 border-background">
                      {a.profilePhotoUrl && <AvatarImage src={`/api/employees/${a.id}/photo`} />}
                      <AvatarFallback className="text-[10px]">{initials(a.name)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
    </div>
  )
}
