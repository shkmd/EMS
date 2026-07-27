"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, FolderKanban } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { apiFetch } from "@/lib/api-client"
import { ProjectFormDialog } from "@/features/projects/components/project-form-dialog"
import type { ProjectSummary } from "@/features/projects/lib/types"

export function ProjectsGrid({
  initialProjects,
  canManage,
}: {
  initialProjects: ProjectSummary[]
  canManage: boolean
}) {
  const [projects, setProjects] = useState(initialProjects)
  const [dialogOpen, setDialogOpen] = useState(false)

  async function refresh() {
    const result = await apiFetch<{ projects: ProjectSummary[] }>("/api/projects")
    if (result.success) setProjects(result.data.projects)
  }

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus /> New Project
          </Button>
        </div>
      )}

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <FolderKanban className="size-8" />
            <p>No projects yet.</p>
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                <Plus /> Create your first project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="truncate">{p.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {p.description && <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {p.doneCount} of {p.taskCount} tasks done
                      </span>
                    </div>
                    <Progress value={p.taskCount > 0 ? (p.doneCount / p.taskCount) * 100 : 0} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ProjectFormDialog target={null} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={refresh} />
    </div>
  )
}
