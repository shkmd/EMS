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

export type TaskParticipantRef = {
  id: string
  name: string
  profilePhotoUrl: string | null
  employeeId: string | null
}

export type TaskFeedItem =
  | { kind: "comment"; id: string; createdAt: string; body: string; author: TaskParticipantRef }
  | { kind: "activity"; id: string; createdAt: string; message: string; actor: TaskParticipantRef }

export type ChecklistItem = {
  id: string
  text: string
  isDone: boolean
  position: number
}

export type TaskAttachmentItem = {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  createdAt: string
  uploadedBy: TaskParticipantRef
}

export type SubtaskItem = {
  id: string
  title: string
  status: string
  assignees: AssigneeRef[]
}

export type TaskExtras = {
  checklistItems: ChecklistItem[]
  attachments: TaskAttachmentItem[]
  subtasks: SubtaskItem[]
}
