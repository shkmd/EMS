import "server-only"

import { format } from "date-fns"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import { assertAllowedFile, deleteUploadedFile, saveUploadedFile, ALLOWED_DOCUMENT_MIME_TYPES, ALLOWED_PHOTO_MIME_TYPES } from "@/lib/storage"
import { notifyUser } from "@/lib/notify"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageProjects, isTaskAssignee } from "@/features/projects/authorization"
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/features/projects/lib/labels"
import type {
  ProjectFormInput,
  ProjectStatusUpdateInput,
  TaskFormInput,
  TaskStatusUpdateInput,
  ReorderTasksInput,
  TaskCommentInput,
  ChecklistItemCreateInput,
  ChecklistItemUpdateInput,
  CreateSubtaskInput,
} from "@/features/projects/schemas"

const ALLOWED_ATTACHMENT_MIME_TYPES = [...new Set([...ALLOWED_DOCUMENT_MIME_TYPES, ...ALLOWED_PHOTO_MIME_TYPES])]

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageProjects(viewer.role)) throw new ForbiddenError()
}

/** Manager, or the task's own assignee — the same boundary as the self-service status update. */
function assertCanEditTask(viewer: AccessTokenPayload, task: { assignees: { employeeId: string }[] }) {
  if (!canManageProjects(viewer.role) && !isTaskAssignee(viewer.employeeId, task)) throw new ForbiddenError()
}

// ---------- Notifications & activity log ----------

async function logActivity(taskId: string, actorId: string, message: string) {
  await prisma.taskActivity.create({ data: { taskId, actorId, message } })
}

/** The people who should hear about a task's activity: its assignees plus whoever created it. */
async function getTaskNotificationRecipients(task: { createdById: string; assignees: { employeeId: string }[] }) {
  const assigneeEmployeeIds = task.assignees.map((a) => a.employeeId)
  const [assigneeEmployees, creator] = await Promise.all([
    assigneeEmployeeIds.length > 0
      ? prisma.employee.findMany({ where: { id: { in: assigneeEmployeeIds } }, select: { id: true, userId: true } })
      : Promise.resolve([]),
    prisma.user.findUnique({ where: { id: task.createdById }, select: { id: true, employee: { select: { id: true } } } }),
  ])

  const recipients = new Map<string, string | null>()
  for (const e of assigneeEmployees) {
    if (e.userId) recipients.set(e.userId, e.id)
  }
  if (creator) recipients.set(creator.id, creator.employee?.id ?? null)
  return recipients
}

async function notifyTaskParticipants(
  task: { id: string; projectId: string; title: string; createdById: string; assignees: { employeeId: string }[] },
  actorUserId: string,
  title: string,
  message: string
) {
  const recipients = await getTaskNotificationRecipients(task)
  recipients.delete(actorUserId)
  if (recipients.size === 0) return

  const link = `/projects/${task.projectId}?task=${task.id}`
  await Promise.all(Array.from(recipients.entries()).map(([userId, employeeId]) => notifyUser(userId, employeeId, title, message, link)))
}

// ---------- Projects ----------

export async function createProject(input: ProjectFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description || null,
      color: input.color,
      createdById: viewer.sub,
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "PROJECT_CREATED", entityType: "Project", entityId: project.id, ...meta })
  return project
}

export async function updateProject(id: string, input: ProjectFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.project.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Project not found")

  const project = await prisma.project.update({
    where: { id },
    data: { name: input.name, description: input.description || null, color: input.color },
  })

  await recordAuditLog({ userId: viewer.sub, action: "PROJECT_UPDATED", entityType: "Project", entityId: id, ...meta })
  return project
}

export async function updateProjectStatus(
  id: string,
  input: ProjectStatusUpdateInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  assertCanManage(viewer)

  const existing = await prisma.project.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Project not found")

  const project = await prisma.project.update({ where: { id }, data: { status: input.status } })

  await recordAuditLog({
    userId: viewer.sub,
    action: input.status === "ARCHIVED" ? "PROJECT_ARCHIVED" : "PROJECT_UNARCHIVED",
    entityType: "Project",
    entityId: id,
    ...meta,
  })
  return project
}

export async function deleteProject(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.project.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Project not found")

  await prisma.project.delete({ where: { id } })
  await recordAuditLog({ userId: viewer.sub, action: "PROJECT_DELETED", entityType: "Project", entityId: id, ...meta })
}

// ---------- Tasks ----------

async function assertValidAssignees(assigneeIds: string[]) {
  if (assigneeIds.length === 0) return
  const count = await prisma.employee.count({ where: { id: { in: assigneeIds }, deletedAt: null, status: "ACTIVE" } })
  if (count !== assigneeIds.length) throw new ValidationError("One or more assignees are invalid")
}

export async function createTask(projectId: string, input: TaskFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
  if (!project) throw new NotFoundError("Project not found")
  await assertValidAssignees(input.assigneeIds)

  const maxPosition = await prisma.task.aggregate({ where: { projectId }, _max: { position: true } })

  const task = await prisma.task.create({
    data: {
      projectId,
      title: input.title,
      description: input.description || null,
      status: input.status,
      priority: input.priority,
      startDate: input.startDate ? new Date(input.startDate) : null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      position: (maxPosition._max.position ?? -1) + 1,
      createdById: viewer.sub,
      assignees: { create: input.assigneeIds.map((employeeId) => ({ employeeId })) },
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "TASK_CREATED", entityType: "Task", entityId: task.id, ...meta })
  await logActivity(task.id, viewer.sub, "created this task")

  if (input.assigneeIds.length > 0) {
    await notifyTaskParticipants(
      { ...task, assignees: input.assigneeIds.map((employeeId) => ({ employeeId })) },
      viewer.sub,
      "New task assigned",
      `You were assigned to "${task.title}"`
    )
  }

  return task
}

export async function updateTask(id: string, input: TaskFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.task.findUnique({
    where: { id },
    include: { assignees: { select: { employeeId: true } } },
  })
  if (!existing) throw new NotFoundError("Task not found")
  await assertValidAssignees(input.assigneeIds)

  const changes: string[] = []
  if (existing.status !== input.status) {
    changes.push(`changed status from ${TASK_STATUS_LABEL[existing.status]} to ${TASK_STATUS_LABEL[input.status]}`)
  }
  if (existing.priority !== input.priority) {
    changes.push(`changed priority from ${TASK_PRIORITY_LABEL[existing.priority]} to ${TASK_PRIORITY_LABEL[input.priority]}`)
  }
  const newStartDate = input.startDate ? new Date(input.startDate) : null
  if ((existing.startDate?.getTime() ?? null) !== (newStartDate?.getTime() ?? null)) {
    changes.push(newStartDate ? `set the start date to ${format(newStartDate, "MMM d, yyyy")}` : "removed the start date")
  }
  const newDueDate = input.dueDate ? new Date(input.dueDate) : null
  if ((existing.dueDate?.getTime() ?? null) !== (newDueDate?.getTime() ?? null)) {
    changes.push(newDueDate ? `set the due date to ${format(newDueDate, "MMM d, yyyy")}` : "removed the due date")
  }
  const existingAssigneeIds = new Set(existing.assignees.map((a) => a.employeeId))
  const newAssigneeIds = new Set(input.assigneeIds)
  const assigneesChanged =
    existingAssigneeIds.size !== newAssigneeIds.size || [...existingAssigneeIds].some((id) => !newAssigneeIds.has(id))
  if (assigneesChanged) changes.push("updated the assignees")

  const task = await prisma.$transaction(async (tx) => {
    await tx.taskAssignee.deleteMany({ where: { taskId: id } })
    return tx.task.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description || null,
        status: input.status,
        priority: input.priority,
        startDate: newStartDate,
        dueDate: newDueDate,
        assignees: { create: input.assigneeIds.map((employeeId) => ({ employeeId })) },
      },
    })
  })

  await recordAuditLog({ userId: viewer.sub, action: "TASK_UPDATED", entityType: "Task", entityId: id, ...meta })

  if (changes.length > 0) {
    await Promise.all(changes.map((message) => logActivity(id, viewer.sub, message)))
    await notifyTaskParticipants(
      { ...task, assignees: input.assigneeIds.map((employeeId) => ({ employeeId })) },
      viewer.sub,
      "Task updated",
      `"${task.title}" was updated: ${changes.join(", ")}`
    )
  }

  return task
}

/** Self-service: the assignee (or a manager) updates just the task's status. */
export async function updateTaskStatus(id: string, input: TaskStatusUpdateInput, viewer: AccessTokenPayload, meta: Meta) {
  const existing = await prisma.task.findUnique({
    where: { id },
    include: { assignees: { select: { employeeId: true } } },
  })
  if (!existing) throw new NotFoundError("Task not found")
  if (!canManageProjects(viewer.role) && !isTaskAssignee(viewer.employeeId, existing)) throw new ForbiddenError()

  const task = await prisma.task.update({ where: { id }, data: { status: input.status } })

  await recordAuditLog({ userId: viewer.sub, action: "TASK_STATUS_UPDATED", entityType: "Task", entityId: id, ...meta })

  if (existing.status !== input.status) {
    const message = `changed status from ${TASK_STATUS_LABEL[existing.status]} to ${TASK_STATUS_LABEL[input.status]}`
    await logActivity(id, viewer.sub, message)
    await notifyTaskParticipants({ ...task, assignees: existing.assignees }, viewer.sub, "Task status changed", `"${task.title}" ${message}`)
  }

  return task
}

/** Manager-only Board drag-and-drop: sets the ordering (and destination status) of every task in one column. */
export async function reorderTasks(projectId: string, input: ReorderTasksInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const tasks = await prisma.task.findMany({
    where: { id: { in: input.orderedTaskIds }, projectId },
    include: { assignees: { select: { employeeId: true } } },
  })
  if (tasks.length !== input.orderedTaskIds.length) throw new ValidationError("One or more tasks are invalid")

  await prisma.$transaction(
    input.orderedTaskIds.map((taskId, index) =>
      prisma.task.update({ where: { id: taskId }, data: { status: input.status, position: index } })
    )
  )

  await recordAuditLog({
    userId: viewer.sub,
    action: "TASKS_REORDERED",
    entityType: "Project",
    entityId: projectId,
    ...meta,
  })

  const moved = tasks.filter((t) => t.status !== input.status)
  await Promise.all(
    moved.map(async (task) => {
      const message = `changed status from ${TASK_STATUS_LABEL[task.status]} to ${TASK_STATUS_LABEL[input.status]}`
      await logActivity(task.id, viewer.sub, message)
      await notifyTaskParticipants(task, viewer.sub, "Task status changed", `"${task.title}" ${message}`)
    })
  )
}

export async function deleteTask(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Task not found")

  await prisma.task.delete({ where: { id } })
  await recordAuditLog({ userId: viewer.sub, action: "TASK_DELETED", entityType: "Task", entityId: id, ...meta })
}

// ---------- Comments ----------

export async function addTaskComment(taskId: string, input: TaskCommentInput, viewer: AccessTokenPayload) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: { select: { employeeId: true } } },
  })
  if (!task) throw new NotFoundError("Task not found")

  const comment = await prisma.taskComment.create({
    data: { taskId, authorId: viewer.sub, body: input.body },
  })

  const preview = input.body.length > 120 ? `${input.body.slice(0, 120)}…` : input.body
  await notifyTaskParticipants(task, viewer.sub, "New comment", `New comment on "${task.title}": ${preview}`)

  return comment
}

// ---------- Checklist ----------

async function requireTaskForEdit(taskId: string, viewer: AccessTokenPayload) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: { select: { employeeId: true } } },
  })
  if (!task) throw new NotFoundError("Task not found")
  assertCanEditTask(viewer, task)
  return task
}

export async function addChecklistItem(taskId: string, input: ChecklistItemCreateInput, viewer: AccessTokenPayload) {
  await requireTaskForEdit(taskId, viewer)

  const maxPosition = await prisma.taskChecklistItem.aggregate({ where: { taskId }, _max: { position: true } })
  return prisma.taskChecklistItem.create({
    data: { taskId, text: input.text, position: (maxPosition._max.position ?? -1) + 1 },
  })
}

export async function updateChecklistItem(id: string, input: ChecklistItemUpdateInput, viewer: AccessTokenPayload) {
  const item = await prisma.taskChecklistItem.findUnique({ where: { id } })
  if (!item) throw new NotFoundError("Checklist item not found")
  await requireTaskForEdit(item.taskId, viewer)

  return prisma.taskChecklistItem.update({ where: { id }, data: { isDone: input.isDone } })
}

export async function deleteChecklistItem(id: string, viewer: AccessTokenPayload) {
  const item = await prisma.taskChecklistItem.findUnique({ where: { id } })
  if (!item) throw new NotFoundError("Checklist item not found")
  await requireTaskForEdit(item.taskId, viewer)

  await prisma.taskChecklistItem.delete({ where: { id } })
}

// ---------- Subtasks ----------

/** Manager-only, lightweight quick-add — single level (a subtask can't itself have subtasks). */
export async function createSubtask(parentTaskId: string, input: CreateSubtaskInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const parent = await prisma.task.findUnique({ where: { id: parentTaskId }, select: { id: true, projectId: true, parentTaskId: true } })
  if (!parent) throw new NotFoundError("Task not found")
  if (parent.parentTaskId) throw new ValidationError("Subtasks can't have their own subtasks")

  const subtask = await prisma.task.create({
    data: {
      projectId: parent.projectId,
      parentTaskId: parent.id,
      title: input.title,
      createdById: viewer.sub,
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "SUBTASK_CREATED", entityType: "Task", entityId: subtask.id, ...meta })
  await logActivity(parentTaskId, viewer.sub, `added a subtask: "${subtask.title}"`)

  return subtask
}

// Deleting a subtask reuses deleteTask below — a subtask is just a Task row,
// so the existing manager-only delete-by-id endpoint already covers it.

// ---------- Attachments ----------

export async function addTaskAttachment(taskId: string, file: File, viewer: AccessTokenPayload) {
  const task = await requireTaskForEdit(taskId, viewer)

  assertAllowedFile(file, ALLOWED_ATTACHMENT_MIME_TYPES)
  const buffer = Buffer.from(await file.arrayBuffer())
  const { relativePath } = await saveUploadedFile(buffer, `tasks/${taskId}`, file.name)

  const attachment = await prisma.taskAttachment.create({
    data: {
      taskId,
      uploadedById: viewer.sub,
      fileUrl: relativePath,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    },
  })

  await logActivity(taskId, viewer.sub, `attached "${file.name}"`)
  await notifyTaskParticipants(task, viewer.sub, "New attachment", `"${file.name}" was attached to "${task.title}"`)

  return attachment
}

export async function deleteTaskAttachment(id: string, viewer: AccessTokenPayload) {
  const attachment = await prisma.taskAttachment.findUnique({ where: { id } })
  if (!attachment) throw new NotFoundError("Attachment not found")

  if (!canManageProjects(viewer.role) && attachment.uploadedById !== viewer.sub) throw new ForbiddenError()

  await prisma.taskAttachment.delete({ where: { id } })
  await deleteUploadedFile(attachment.fileUrl)
}
