"use client"

import { useState } from "react"
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { toast } from "sonner"
import { Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"
import { TaskCard } from "@/features/projects/components/task-card"
import { TaskFormDialog } from "@/features/projects/components/task-form-dialog"
import { TaskDetailDialog } from "@/features/projects/components/task-detail-dialog"
import { TASK_STATUS_BADGE, TASK_STATUS_LABEL, TASK_STATUS_ORDER } from "@/features/projects/lib/labels"
import type { AssigneeRef, TaskItem } from "@/features/projects/lib/types"

function isStatus(id: string): boolean {
  return (TASK_STATUS_ORDER as readonly string[]).includes(id)
}

function SortableCard({ task, onClick }: { task: TaskItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-50")}
    >
      <TaskCard task={task} canChangeStatus={false} onClick={onClick} />
    </div>
  )
}

function Column({ status, count, children }: { status: string; count: number; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: status })
  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-muted/40 p-2">
      <div className="flex items-center gap-2 px-1">
        <Badge className={cn(TASK_STATUS_BADGE[status])}>{TASK_STATUS_LABEL[status]}</Badge>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <div ref={setNodeRef} className="flex min-h-16 flex-col gap-2">
        {children}
      </div>
    </div>
  )
}

export function TaskBoardView({
  projectId,
  initialTasks,
  assignableEmployees,
  canManage,
  currentEmployeeId,
  currentUserId,
}: {
  projectId: string
  initialTasks: TaskItem[]
  assignableEmployees: AssigneeRef[]
  canManage: boolean
  currentEmployeeId: string | null
  currentUserId: string
}) {
  const [tasks, setTasks] = useState(initialTasks)
  const [editTarget, setEditTarget] = useState<TaskItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<TaskItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function openDetail(task: TaskItem) {
    setDetailTarget(task)
    setDetailOpen(true)
  }

  const columns = TASK_STATUS_ORDER.map((status) => ({
    status,
    tasks: tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position),
  }))

  function findColumnOf(taskId: string): string | undefined {
    return tasks.find((t) => t.id === taskId)?.status
  }

  async function persistColumn(status: string, orderedIds: string[]) {
    const result = await apiFetch(`/api/projects/${projectId}/tasks/reorder`, {
      method: "PATCH",
      body: { status, orderedTaskIds: orderedIds },
    })
    if (!result.success) toast.error(result.error.message)
  }

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const activeTask = tasks.find((t) => t.id === activeId)
    if (!activeTask) return

    const destStatus = isStatus(overId) ? overId : findColumnOf(overId)
    if (!destStatus) return

    const destList = tasks.filter((t) => t.status === destStatus && t.id !== activeId).sort((a, b) => a.position - b.position)
    let insertIndex = destList.length
    if (!isStatus(overId)) {
      const idx = destList.findIndex((t) => t.id === overId)
      if (idx !== -1) insertIndex = idx
    }
    destList.splice(insertIndex, 0, activeTask)

    const orderedIds = destList.map((t) => t.id)
    const destIdSet = new Set(orderedIds)

    setTasks((prev) => {
      const others = prev.filter((t) => !destIdSet.has(t.id))
      const updatedDest = destList.map((t, i) => ({ ...t, status: destStatus, position: i }))
      return [...others, ...updatedDest]
    })

    await persistColumn(destStatus, orderedIds)
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

      {canManage ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {columns.map((col) => (
              <Column key={col.status} status={col.status} count={col.tasks.length}>
                <SortableContext items={col.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {col.tasks.map((task) => (
                    <SortableCard key={task.id} task={task} onClick={() => openDetail(task)} />
                  ))}
                </SortableContext>
              </Column>
            ))}
          </div>
        </DndContext>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map((col) => (
            <Column key={col.status} status={col.status} count={col.tasks.length}>
              {col.tasks.map((task) => {
                const isMine = currentEmployeeId !== null && task.assignees.some((a) => a.id === currentEmployeeId)
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    canChangeStatus={isMine}
                    onStatusChange={isMine ? (status) => handleStatusChange(task, status) : undefined}
                    onClick={() => openDetail(task)}
                  />
                )
              })}
            </Column>
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
    </div>
  )
}
