"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { CheckCircle2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { INTERVIEW_STATUS_BADGE, INTERVIEW_STATUS_LABEL, RECOMMENDATION_LABEL } from "@/features/recruitment/lib/labels"
import { InterviewFeedbackDialog } from "@/features/recruitment/components/interview-feedback-dialog"
import { apiFetch } from "@/lib/api-client"

type Feedback = { rating: number; recommendation: string; comments: string | null }
type MyInterviewRow = {
  id: string
  roundName: string
  scheduledAt: string
  location: string | null
  status: string
  candidate: { id: string; firstName: string; lastName: string; jobOpening: { title: string } }
  panelists: { feedback: Feedback | null }[]
}

export function MyInterviewsList({ initialInterviews }: { initialInterviews: MyInterviewRow[] }) {
  const [interviews, setInterviews] = useState(initialInterviews)
  const [feedbackTarget, setFeedbackTarget] = useState<MyInterviewRow | null>(null)

  function reload() {
    apiFetch<{ interviews: MyInterviewRow[] }>("/api/recruitment/interviews/my").then((r) => {
      if (r.success) setInterviews(r.data.interviews)
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {interviews.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">You have no interview panel assignments.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Your Feedback</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map((i) => {
                  const feedback = i.panelists[0]?.feedback ?? null
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Link href={`/recruitment/candidates/${i.candidate.id}`} className="font-medium hover:underline">
                          {i.candidate.firstName} {i.candidate.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>{i.candidate.jobOpening.title}</TableCell>
                      <TableCell>{i.roundName}</TableCell>
                      <TableCell>{format(new Date(i.scheduledAt), "dd MMM yyyy, h:mm a")}</TableCell>
                      <TableCell>
                        <Badge className={INTERVIEW_STATUS_BADGE[i.status]}>{INTERVIEW_STATUS_LABEL[i.status] ?? i.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {feedback ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500">
                            <CheckCircle2 className="size-3.5" /> {RECOMMENDATION_LABEL[feedback.recommendation]}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not submitted</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => setFeedbackTarget(i)}>
                          {feedback ? "Edit" : "Submit"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <InterviewFeedbackDialog
        interviewId={feedbackTarget?.id ?? null}
        candidateName={feedbackTarget ? `${feedbackTarget.candidate.firstName} ${feedbackTarget.candidate.lastName}` : ""}
        defaultValues={
          feedbackTarget?.panelists[0]?.feedback
            ? {
                rating: String(feedbackTarget.panelists[0].feedback.rating),
                recommendation: feedbackTarget.panelists[0].feedback.recommendation as never,
                comments: feedbackTarget.panelists[0].feedback.comments ?? "",
              }
            : undefined
        }
        open={!!feedbackTarget}
        onOpenChange={(next) => !next && setFeedbackTarget(null)}
        onSaved={() => {
          setFeedbackTarget(null)
          reload()
        }}
      />
    </Card>
  )
}
