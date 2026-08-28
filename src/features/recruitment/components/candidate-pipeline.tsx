"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { toast } from "sonner"
import { Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"
import { CANDIDATE_STAGE_BADGE, CANDIDATE_STAGE_LABEL, CANDIDATE_STAGE_OPTIONS } from "@/features/recruitment/lib/labels"
import { CandidateFormDialog } from "@/features/recruitment/components/candidate-form-dialog"

type CandidateRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  stage: string
  source: string | null
  appliedAt: string
  hiredEmployeeId: string | null
  _count: { interviews: number }
}

export function CandidatePipeline({ jobOpeningId, initialCandidates }: { jobOpeningId: string; initialCandidates: CandidateRow[] }) {
  const [candidates, setCandidates] = useState(initialCandidates)
  const [formOpen, setFormOpen] = useState(false)

  function reload() {
    apiFetch<{ candidates: CandidateRow[] }>(`/api/recruitment/job-openings/${jobOpeningId}/candidates`).then((r) => {
      if (r.success) setCandidates(r.data.candidates)
    })
  }

  async function handleStageChange(candidateId: string, stage: string) {
    if (stage === "REJECTED") {
      const reason = window.prompt("Reason for rejecting this candidate:")
      if (reason === null) return
      const result = await apiFetch(`/api/recruitment/candidates/${candidateId}/stage`, {
        method: "PATCH",
        body: { stage, rejectionReason: reason },
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      reload()
      return
    }

    const result = await apiFetch(`/api/recruitment/candidates/${candidateId}/stage`, { method: "PATCH", body: { stage } })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    reload()
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setFormOpen(true)}>
            <Plus /> Add Candidate
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Interviews</TableHead>
                <TableHead>Applied</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No candidates yet.
                  </TableCell>
                </TableRow>
              ) : (
                candidates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/recruitment/candidates/${c.id}`} className="hover:underline">
                        {c.firstName} {c.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.source ?? "—"}</TableCell>
                    <TableCell>
                      {c.stage === "HIRED" ? (
                        <Badge className={CANDIDATE_STAGE_BADGE.HIRED}>Hired</Badge>
                      ) : (
                        <Select value={c.stage} onValueChange={(v) => handleStageChange(c.id, v)}>
                          <SelectTrigger className="h-7 w-36 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CANDIDATE_STAGE_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {CANDIDATE_STAGE_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>{c._count.interviews}</TableCell>
                    <TableCell>{format(new Date(c.appliedAt), "dd MMM yyyy")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CandidateFormDialog jobOpeningId={jobOpeningId} open={formOpen} onOpenChange={setFormOpen} onSaved={reload} />
    </Card>
  )
}
