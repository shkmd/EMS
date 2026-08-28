"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { toast } from "sonner"
import { CalendarPlus, Download, Loader2, Pencil, Star, Trash2, UserPlus } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { initials } from "@/features/messaging/lib/initials"
import {
  CANDIDATE_STAGE_BADGE,
  CANDIDATE_STAGE_LABEL,
  CANDIDATE_STAGE_OPTIONS,
  INTERVIEW_STATUS_BADGE,
  INTERVIEW_STATUS_LABEL,
  RECOMMENDATION_BADGE,
  RECOMMENDATION_LABEL,
} from "@/features/recruitment/lib/labels"
import { InterviewFormDialog, type InterviewEditTarget } from "@/features/recruitment/components/interview-form-dialog"
import { InterviewFeedbackDialog } from "@/features/recruitment/components/interview-feedback-dialog"

type Feedback = { rating: number; recommendation: string; comments: string | null }
type Panelist = { id: string; employee: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null }; feedback: Feedback | null }
type InterviewRow = {
  id: string
  roundName: string
  scheduledAt: string
  durationMinutes: number | null
  location: string | null
  status: string
  panelists: Panelist[]
}
type Candidate = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  resumeUrl: string | null
  resumeFileName: string | null
  coverLetter: string | null
  source: string | null
  stage: string
  rejectionReason: string | null
  hiredEmployeeId: string | null
  appliedAt: string
  jobOpening: { id: string; title: string }
  interviews: InterviewRow[]
}

export function CandidateDetailView({
  candidate: initialCandidate,
  canManage,
  currentEmployeeId,
}: {
  candidate: Candidate
  canManage: boolean
  currentEmployeeId: string | null
}) {
  const [candidate, setCandidate] = useState(initialCandidate)
  const [interviewTarget, setInterviewTarget] = useState<InterviewEditTarget>(null)
  const [interviewFormOpen, setInterviewFormOpen] = useState(false)
  const [feedbackTarget, setFeedbackTarget] = useState<InterviewRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InterviewRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function reload() {
    apiFetch<{ candidate: Candidate }>(`/api/recruitment/candidates/${candidate.id}`).then((r) => {
      if (r.success) setCandidate(r.data.candidate)
    })
  }

  async function handleStageChange(stage: string) {
    if (stage === "REJECTED") {
      const reason = window.prompt("Reason for rejecting this candidate:")
      if (reason === null) return
      const result = await apiFetch(`/api/recruitment/candidates/${candidate.id}/stage`, { method: "PATCH", body: { stage, rejectionReason: reason } })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      reload()
      return
    }
    const result = await apiFetch(`/api/recruitment/candidates/${candidate.id}/stage`, { method: "PATCH", body: { stage } })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    reload()
  }

  async function handleDeleteInterview() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/recruitment/interviews/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      setDeleteTarget(null)
      reload()
    } finally {
      setIsDeleting(false)
    }
  }

  const convertUrl = `/employees/new?candidateId=${candidate.id}&firstName=${encodeURIComponent(candidate.firstName)}&lastName=${encodeURIComponent(candidate.lastName)}&email=${encodeURIComponent(candidate.email)}&mobile=${encodeURIComponent(candidate.phone ?? "")}`

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback>{initials(`${candidate.firstName} ${candidate.lastName}`)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">
                {candidate.firstName} {candidate.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {candidate.email}
                {candidate.phone && ` · ${candidate.phone}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Applied for <span className="font-medium">{candidate.jobOpening.title}</span> on {format(new Date(candidate.appliedAt), "dd MMM yyyy")}
                {candidate.source && ` via ${candidate.source}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {candidate.resumeUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/recruitment/candidates/${candidate.id}/resume`}>
                  <Download /> Resume
                </a>
              </Button>
            )}
            {candidate.stage === "HIRED" ? (
              <>
                <Badge className={CANDIDATE_STAGE_BADGE.HIRED}>Hired</Badge>
                {candidate.hiredEmployeeId && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/employees/${candidate.hiredEmployeeId}`}>View employee profile</Link>
                  </Button>
                )}
              </>
            ) : canManage ? (
              <>
                <Select value={candidate.stage} onValueChange={handleStageChange}>
                  <SelectTrigger className="h-8 w-36 text-xs">
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
                <Button size="sm" asChild>
                  <Link href={convertUrl}>
                    <UserPlus /> Convert to Employee
                  </Link>
                </Button>
              </>
            ) : (
              <Badge className={CANDIDATE_STAGE_BADGE[candidate.stage]}>{CANDIDATE_STAGE_LABEL[candidate.stage]}</Badge>
            )}
          </div>
        </CardContent>
        {candidate.stage === "REJECTED" && candidate.rejectionReason && (
          <CardContent className="pt-0 text-sm text-muted-foreground">Rejection reason: {candidate.rejectionReason}</CardContent>
        )}
        {candidate.coverLetter && <CardContent className="pt-0 text-sm">{candidate.coverLetter}</CardContent>}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Interviews</CardTitle>
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                setInterviewTarget(null)
                setInterviewFormOpen(true)
              }}
            >
              <CalendarPlus /> Schedule Interview
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {candidate.interviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>
          ) : (
            candidate.interviews.map((interview) => {
              const myPanelistRow = interview.panelists.find((p) => p.employee.id === currentEmployeeId)
              return (
                <div key={interview.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{interview.roundName}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(interview.scheduledAt), "dd MMM yyyy, h:mm a")}
                        {interview.durationMinutes && ` · ${interview.durationMinutes} min`}
                        {interview.location && ` · ${interview.location}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={INTERVIEW_STATUS_BADGE[interview.status]}>{INTERVIEW_STATUS_LABEL[interview.status]}</Badge>
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => {
                              setInterviewTarget(interview)
                              setInterviewFormOpen(true)
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => setDeleteTarget(interview)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                      {myPanelistRow && (
                        <Button variant="outline" size="sm" onClick={() => setFeedbackTarget(interview)}>
                          {myPanelistRow.feedback ? "Edit my feedback" : "Submit feedback"}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3">
                    {interview.panelists.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                        <Avatar className="size-6">
                          {p.employee.profilePhotoUrl && <AvatarImage src={`/api/employees/${p.employee.id}/photo`} />}
                          <AvatarFallback className="text-[10px]">{initials(`${p.employee.firstName} ${p.employee.lastName}`)}</AvatarFallback>
                        </Avatar>
                        <div className="text-xs">
                          <p className="font-medium">
                            {p.employee.firstName} {p.employee.lastName}
                          </p>
                          {p.feedback ? (
                            <div className="flex items-center gap-1">
                              <span className="flex items-center gap-0.5">
                                {Array.from({ length: p.feedback.rating }).map((_, i) => (
                                  <Star key={i} className="size-2.5 fill-amber-400 text-amber-400" />
                                ))}
                              </span>
                              <Badge className={`${RECOMMENDATION_BADGE[p.feedback.recommendation]} px-1 py-0 text-[10px]`}>
                                {RECOMMENDATION_LABEL[p.feedback.recommendation]}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Awaiting feedback</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {interview.panelists.some((p) => p.feedback?.comments) && (
                    <div className="mt-3 flex flex-col gap-1.5 border-t pt-3">
                      {interview.panelists
                        .filter((p) => p.feedback?.comments)
                        .map((p) => (
                          <p key={p.id} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {p.employee.firstName} {p.employee.lastName}:
                            </span>{" "}
                            {p.feedback!.comments}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {canManage && (
        <InterviewFormDialog
          candidateId={candidate.id}
          target={interviewTarget}
          open={interviewFormOpen}
          onOpenChange={setInterviewFormOpen}
          onSaved={reload}
        />
      )}

      <InterviewFeedbackDialog
        interviewId={feedbackTarget?.id ?? null}
        candidateName={`${candidate.firstName} ${candidate.lastName}`}
        defaultValues={(() => {
          const row = feedbackTarget?.panelists.find((p) => p.employee.id === currentEmployeeId)?.feedback
          return row ? { rating: String(row.rating), recommendation: row.recommendation as never, comments: row.comments ?? "" } : undefined
        })()}
        open={!!feedbackTarget}
        onOpenChange={(next) => !next && setFeedbackTarget(null)}
        onSaved={() => {
          setFeedbackTarget(null)
          reload()
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this interview?</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget && <>This removes &quot;{deleteTarget.roundName}&quot; and its feedback.</>}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInterview} disabled={isDeleting} className="bg-destructive text-white hover:bg-destructive/90">
              {isDeleting && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
