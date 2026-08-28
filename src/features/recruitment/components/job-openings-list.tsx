"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { toast } from "sonner"
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
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
import { JOB_OPENING_STATUS_BADGE, JOB_OPENING_STATUS_LABEL, EMPLOYMENT_TYPE_LABEL } from "@/features/recruitment/lib/labels"
import { JobOpeningFormDialog, type JobOpeningEditTarget } from "@/features/recruitment/components/job-opening-form-dialog"

type JobOpeningRow = JobOpeningEditTarget & {
  status: string
  department: { name: string } | null
  vertical: { name: string } | null
  createdAt: string
  _count: { candidates: number }
}

export function JobOpeningsList() {
  const [jobOpenings, setJobOpenings] = useState<JobOpeningRow[] | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<JobOpeningEditTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobOpeningRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function load() {
    apiFetch<{ jobOpenings: JobOpeningRow[] }>("/api/recruitment/job-openings?includeClosed=true").then((r) => {
      if (r.success) setJobOpenings(r.data.jobOpenings)
    })
  }

  useEffect(() => {
    load()
  }, [])

  async function handleStatusChange(id: string, status: string) {
    const result = await apiFetch(`/api/recruitment/job-openings/${id}/status`, { method: "PATCH", body: { status } })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    load()
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/recruitment/job-openings/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Job opening deleted")
      setDeleteTarget(null)
      load()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4 flex justify-end">
          <Button
            onClick={() => {
              setEditTarget(null)
              setFormOpen(true)
            }}
          >
            <Plus /> New Opening
          </Button>
        </div>

        {!jobOpenings ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Vertical</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Positions</TableHead>
                  <TableHead>Candidates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobOpenings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No job openings yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  jobOpenings.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium">
                        <Link href={`/recruitment/${j.id}`} className="hover:underline">
                          {j.title}
                        </Link>
                      </TableCell>
                      <TableCell>{j.department?.name ?? "—"}</TableCell>
                      <TableCell>{j.vertical?.name ?? "—"}</TableCell>
                      <TableCell>{EMPLOYMENT_TYPE_LABEL[j.employmentType] ?? j.employmentType}</TableCell>
                      <TableCell>{j.numberOfPositions}</TableCell>
                      <TableCell>{j._count.candidates}</TableCell>
                      <TableCell>
                        <Badge className={JOB_OPENING_STATUS_BADGE[j.status]}>{JOB_OPENING_STATUS_LABEL[j.status] ?? j.status}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(j.createdAt), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditTarget(j)
                                setFormOpen(true)
                              }}
                            >
                              <Pencil /> Edit
                            </DropdownMenuItem>
                            {Object.keys(JOB_OPENING_STATUS_LABEL)
                              .filter((s) => s !== j.status)
                              .map((s) => (
                                <DropdownMenuItem key={s} onClick={() => handleStatusChange(j.id, s)}>
                                  Mark {JOB_OPENING_STATUS_LABEL[s]}
                                </DropdownMenuItem>
                              ))}
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(j)}>
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <JobOpeningFormDialog target={editTarget} open={formOpen} onOpenChange={setFormOpen} onSaved={load} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job opening?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  This will remove &quot;{deleteTarget.title}&quot;. Openings with candidates can&apos;t be deleted — close them instead.
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
    </Card>
  )
}
