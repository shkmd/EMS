import type { Metadata } from "next";

import { requireSession } from "@/features/auth/session";
import { canManageProjects } from "@/features/projects/authorization";
import { listProjects } from "@/features/projects/queries";
import { ProjectsGrid } from "@/features/projects/components/projects-grid";

export const metadata: Metadata = { title: "Projects | EMS" };

export default async function ProjectsPage() {
  const session = await requireSession();
  const canManage = canManageProjects(session.role);

  const projectsRaw = await listProjects(session);
  const projects = projectsRaw.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">Track work across teams, grouped into projects.</p>
      </div>
      <ProjectsGrid initialProjects={projects} canManage={canManage} />
    </div>
  );
}
