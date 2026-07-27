"use client"

import { format, isBefore, startOfToday } from "date-fns"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { initials } from "@/features/messaging/lib/initials"
import { TASK_PRIORITY_BADGE, TASK_PRIORITY_LABEL, TASK_STATUS_LABEL, TASK_STATUS_ORDER } from "@/features/projects/lib/labels"
import type { TaskItem } from "@/features/projects/lib/types"

export function TaskCard({
  task,
  canChangeStatus,
  onStatusChange,
  onClick,
}: {
  task: TaskItem
  canChangeStatus: boolean
  onStatusChange?: (status: string) => void
  onClick?: () => void
}) {
  const overdue = task.dueDate && task.status !== "DONE" && isBefore(new Date(task.dueDate), startOfToday())

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-3 text-left shadow-sm",
        onClick && "cursor-pointer hover:bg-accent/30"
      )}
      onClick={onClick}
    >
      <p className="text-sm font-medium">{task.title}</p>
      <div className="flex items-center justify-between gap-2">
        <Badge className={cn(TASK_PRIORITY_BADGE[task.priority])}>{TASK_PRIORITY_LABEL[task.priority]}</Badge>
        {task.dueDate && (
          <span className={cn("text-xs", overdue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground")}>
            {format(new Date(task.dueDate), "MMM d")}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex -space-x-2">
          {task.assignees.map((a) => (
            <Avatar key={a.id} className="size-6 border-2 border-background">
              {a.profilePhotoUrl && <AvatarImage src={`/api/employees/${a.id}/photo`} />}
              <AvatarFallback className="text-[10px]">{initials(a.name)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        {!canChangeStatus && <span className="text-xs text-muted-foreground">{TASK_STATUS_LABEL[task.status]}</span>}
      </div>
      {canChangeStatus && onStatusChange && (
        <Select value={task.status} onValueChange={onStatusChange}>
          <SelectTrigger size="sm" onClick={(e) => e.stopPropagation()} className="w-full">
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
      )}
    </div>
  )
}
