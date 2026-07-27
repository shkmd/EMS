import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageProjects, isTaskAssignee } from "@/features/projects/authorization"
import type {
  ProjectFormInput,
  ProjectStatusUpdateInput,
  TaskFormInput,
  TaskStatusUpdateInput,
} from "@/features/projects/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageProjects(viewer.role)) throw new ForbiddenError()
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
  return task
}

export async function updateTask(id: string, input: TaskFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Task not found")
  await assertValidAssignees(input.assigneeIds)

  const task = await prisma.$transaction(async (tx) => {
    await tx.taskAssignee.deleteMany({ where: { taskId: id } })
    return tx.task.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description || null,
        status: input.status,
        priority: input.priority,
        startDate: input.startDate ? new Date(input.startDate) : null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        assignees: { create: input.assigneeIds.map((employeeId) => ({ employeeId })) },
      },
    })
  })

  await recordAuditLog({ userId: viewer.sub, action: "TASK_UPDATED", entityType: "Task", entityId: id, ...meta })
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
  return task
}

export async function deleteTask(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Task not found")

  await prisma.task.delete({ where: { id } })
  await recordAuditLog({ userId: viewer.sub, action: "TASK_DELETED", entityType: "Task", entityId: id, ...meta })
}
