"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, FolderKanban, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { apiFetch } from "@/lib/api-client"
import { ProjectFormDialog, type ProjectEditTarget } from "@/features/projects/components/project-form-dialog"
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
  const [editTarget, setEditTarget] = useState<ProjectEditTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function refresh() {
    const result = await apiFetch<{ projects: ProjectSummary[] }>("/api/projects")
    if (result.success) setProjects(result.data.projects)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/projects/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Project deleted")
      setDeleteTarget(null)
      refresh()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditTarget(null)
              setDialogOpen(true)
            }}
          >
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditTarget(null)
                  setDialogOpen(true)
                }}
              >
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
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <CardTitle className="flex min-w-0 items-center gap-2">
                    <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="truncate">{p.name}</span>
                  </CardTitle>
                  {canManage && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="shrink-0">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditTarget(p)
                              setDialogOpen(true)
                            }}
                          >
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(p)}>
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
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

      <ProjectFormDialog target={editTarget} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={refresh} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  This permanently removes &quot;{deleteTarget.name}&quot; and all {deleteTarget.taskCount} of its task
                  {deleteTarget.taskCount === 1 ? "" : "s"}. This can&apos;t be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive text-white hover:bg-destructive/90">
              {isDeleting && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
