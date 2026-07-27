export type AssigneeRef = {
  id: string
  name: string
  profilePhotoUrl: string | null
}

export type ProjectSummary = {
  id: string
  name: string
  description: string | null
  color: string
  status: string
  taskCount: number
  doneCount: number
  createdAt: string
  updatedAt: string
}

export type TaskItem = {
  id: string
  projectId: string
  title: string
  description: string | null
  status: string
  priority: string
  startDate: string | null
  dueDate: string | null
  position: number
  createdAt: string
  updatedAt: string
  assignees: AssigneeRef[]
}
