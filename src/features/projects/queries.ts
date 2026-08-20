import "server-only"

import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import { assertVerticalVisible, getVisibleVerticalIds } from "@/features/verticals/scope"
import type { TaskExtras, TaskFeedItem, TaskParticipantRef } from "@/features/projects/lib/types"

const assigneeSelect = {
  employee: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
} satisfies Record<string, unknown>

function toAssigneeRef(row: {
  employee: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null }
}) {
  return {
    id: row.employee.id,
    name: `${row.employee.firstName} ${row.employee.lastName}`,
    profilePhotoUrl: row.employee.profilePhotoUrl,
  }
}

const participantSelect = {
  id: true,
  email: true,
  employee: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
} satisfies Record<string, unknown>

type ParticipantRow = {
  id: string
  email: string
  employee: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null } | null
}

function toParticipantRef(user: ParticipantRow): TaskParticipantRef {
  return {
    id: user.id,
    name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email.split("@")[0]!,
    profilePhotoUrl: user.employee?.profilePhotoUrl ?? null,
    employeeId: user.employee?.id ?? null,
  }
}

export async function listProjects(viewer: AccessTokenPayload, includeArchived = false) {
  const visibleVerticalIds = await getVisibleVerticalIds(viewer)

  const projects = await prisma.project.findMany({
    where: {
      ...(includeArchived ? {} : { status: "ACTIVE" }),
      ...(visibleVerticalIds !== null ? { verticalId: { in: visibleVerticalIds } } : {}),
    },
    include: {
      _count: { select: { tasks: true } },
      tasks: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return projects.map((p) => {
    const doneCount = p.tasks.filter((t) => t.status === "DONE").length
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color,
      status: p.status,
      taskCount: p._count.tasks,
      doneCount,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }
  })
}

export async function getProject(id: string, viewer: AccessTokenPayload) {
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) throw new NotFoundError("Project not found")
  await assertVerticalVisible(viewer, project.verticalId)
  return project
}

export async function listProjectTasks(projectId: string, viewer: AccessTokenPayload) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, verticalId: true } })
  if (!project) throw new NotFoundError("Project not found")
  await assertVerticalVisible(viewer, project.verticalId)

  const tasks = await prisma.task.findMany({
    where: { projectId, parentTaskId: null },
    include: { assignees: { select: assigneeSelect } },
    orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "asc" }],
  })

  return tasks.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    startDate: t.startDate,
    dueDate: t.dueDate,
    position: t.position,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    assignees: t.assignees.map(toAssigneeRef),
  }))
}

async function assertTaskProjectVisible(taskId: string, viewer: AccessTokenPayload) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { project: { select: { verticalId: true } } } })
  if (!task) throw new NotFoundError("Task not found")
  await assertVerticalVisible(viewer, task.project.verticalId)
}

export async function getTask(id: string, viewer: AccessTokenPayload) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: { assignees: { select: assigneeSelect }, project: { select: { verticalId: true } } },
  })
  if (!task) throw new NotFoundError("Task not found")
  await assertVerticalVisible(viewer, task.project.verticalId)
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    startDate: task.startDate,
    dueDate: task.dueDate,
    position: task.position,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    assignees: task.assignees.map(toAssigneeRef),
  }
}

/** Comments and activity log entries for a task's detail panel, merged into one time-ordered feed. */
export async function getTaskFeed(taskId: string, viewer: AccessTokenPayload): Promise<TaskFeedItem[]> {
  await assertTaskProjectVisible(taskId, viewer)

  const [comments, activities] = await Promise.all([
    prisma.taskComment.findMany({
      where: { taskId },
      include: { author: { select: participantSelect } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.taskActivity.findMany({
      where: { taskId },
      include: { actor: { select: participantSelect } },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const feed: TaskFeedItem[] = [
    ...comments.map(
      (c): TaskFeedItem => ({
        kind: "comment",
        id: c.id,
        createdAt: c.createdAt.toISOString(),
        body: c.body,
        author: toParticipantRef(c.author),
      })
    ),
    ...activities.map(
      (a): TaskFeedItem => ({
        kind: "activity",
        id: a.id,
        createdAt: a.createdAt.toISOString(),
        message: a.message,
        actor: toParticipantRef(a.actor),
      })
    ),
  ]

  return feed.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

/** Checklist, attachments, and subtasks for a task's detail panel — fetched together in one call. */
export async function getTaskExtras(taskId: string, viewer: AccessTokenPayload): Promise<TaskExtras> {
  await assertTaskProjectVisible(taskId, viewer)

  const [checklistItems, attachments, subtasks] = await Promise.all([
    prisma.taskChecklistItem.findMany({
      where: { taskId },
      orderBy: { position: "asc" },
      select: { id: true, text: true, isDone: true, position: true },
    }),
    prisma.taskAttachment.findMany({
      where: { taskId },
      include: { uploadedBy: { select: participantSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      where: { parentTaskId: taskId },
      include: { assignees: { select: assigneeSelect } },
      orderBy: { createdAt: "asc" },
    }),
  ])

  return {
    checklistItems,
    attachments: attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileType: a.fileType,
      fileSize: a.fileSize,
      createdAt: a.createdAt.toISOString(),
      uploadedBy: toParticipantRef(a.uploadedBy),
    })),
    subtasks: subtasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      assignees: t.assignees.map(toAssigneeRef),
    })),
  }
}

/** Not-done tasks assigned to this employee, across every project — for a
 * dashboard "my tasks" widget, not the full per-project task list. */
export async function listMyTasks(employeeId: string) {
  const tasks = await prisma.task.findMany({
    where: { assignees: { some: { employeeId } }, status: { not: "DONE" } },
    include: { project: { select: { id: true, name: true, color: true } } },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
    take: 20,
  })

  return tasks.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    projectName: t.project.name,
    projectColor: t.project.color,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
  }))
}

/** Active employees selectable as task assignees. */
export async function listAssignableEmployees() {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  return employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, profilePhotoUrl: e.profilePhotoUrl }))
}
