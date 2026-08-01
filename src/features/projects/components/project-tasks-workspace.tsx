"use client"

import { useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiFetch } from "@/lib/api-client"
import { TaskListView } from "@/features/projects/components/task-list-view"
import { TaskBoardView } from "@/features/projects/components/task-board-view"
import { TaskGanttView } from "@/features/projects/components/task-gantt-view"
import type { AssigneeRef, TaskItem } from "@/features/projects/lib/types"

/**
 * Owns the task list as a single source of truth shared across List/Board/
 * Gantt. Each view previously kept its own `useState(initialTasks)`, seeded
 * once from the server-rendered snapshot — since Radix Tabs unmounts inactive
 * TabsContent by default, switching tabs remounted the next view from that
 * same stale snapshot, so a status change made in one tab silently reverted
 * when viewed from another. Lifting the state here (this component never
 * unmounts on tab switch) fixes that at the root.
 */
export function ProjectTasksWorkspace({
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

  async function refresh() {
    const result = await apiFetch<{ tasks: TaskItem[] }>(`/api/projects/${projectId}/tasks`)
    if (result.success) setTasks(result.data.tasks)
  }

  const shared = {
    projectId,
    tasks,
    setTasks,
    refresh,
    assignableEmployees,
    canManage,
    currentEmployeeId,
    currentUserId,
  }

  return (
    <Tabs defaultValue="list">
      <TabsList>
        <TabsTrigger value="list">List</TabsTrigger>
        <TabsTrigger value="board">Board</TabsTrigger>
        <TabsTrigger value="gantt">Gantt</TabsTrigger>
      </TabsList>
      <TabsContent value="list">
        <TaskListView {...shared} initialOpenTaskId={initialOpenTaskId} />
      </TabsContent>
      <TabsContent value="board">
        <TaskBoardView {...shared} />
      </TabsContent>
      <TabsContent value="gantt">
        <TaskGanttView {...shared} />
      </TabsContent>
    </Tabs>
  )
}
