import "server-only"

import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/errors"

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

export async function listProjects(includeArchived = false) {
  const projects = await prisma.project.findMany({
    where: includeArchived ? {} : { status: "ACTIVE" },
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

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) throw new NotFoundError("Project not found")
  return project
}

export async function listProjectTasks(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
  if (!project) throw new NotFoundError("Project not found")

  const tasks = await prisma.task.findMany({
    where: { projectId },
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

export async function getTask(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: { assignees: { select: assigneeSelect } },
  })
  if (!task) throw new NotFoundError("Task not found")
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

/** Active employees selectable as task assignees. */
export async function listAssignableEmployees() {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  return employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, profilePhotoUrl: e.profilePhotoUrl }))
}
