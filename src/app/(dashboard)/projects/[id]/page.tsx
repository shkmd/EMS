import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/features/auth/session";
import { canManageProjects } from "@/features/projects/authorization";
import { getProject, listProjectTasks, listAssignableEmployees } from "@/features/projects/queries";
import { TaskListView } from "@/features/projects/components/task-list-view";
import { TaskBoardView } from "@/features/projects/components/task-board-view";

export const metadata: Metadata = { title: "Project | EMS" };

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const canManage = canManageProjects(session.role);

  const [project, tasksRaw, employees] = await Promise.all([
    getProject(id),
    listProjectTasks(id),
    listAssignableEmployees(),
  ]);

  const tasks = tasksRaw.map((t) => ({
    ...t,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <Link href="/projects" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> All projects
        </Link>
        <div className="flex items-center gap-2">
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.status === "ARCHIVED" && <Badge variant="secondary">Archived</Badge>}
        </div>
        {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="gantt" disabled>
            Gantt <Badge variant="secondary">Soon</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <TaskListView
            projectId={project.id}
            initialTasks={tasks}
            assignableEmployees={employees}
            canManage={canManage}
            currentEmployeeId={session.employeeId}
          />
        </TabsContent>
        <TabsContent value="board">
          <TaskBoardView
            projectId={project.id}
            initialTasks={tasks}
            assignableEmployees={employees}
            canManage={canManage}
            currentEmployeeId={session.employeeId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
