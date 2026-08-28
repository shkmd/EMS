"use client"

import { useRouter } from "next/navigation"
import { Award, CheckCircle2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type MyEnrollment = {
  id: string
  status: string
  progressPercent: number
  quizScore: number | null
  quizPassed: boolean | null
  certificateIssuedAt: string | null
  course: { id: string; title: string; category: string | null; durationMinutes: number | null }
}

export function MyLearningList({ enrollments }: { enrollments: MyEnrollment[] }) {
  const router = useRouter()

  if (enrollments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No training assigned yet. Browse the catalog to enroll in a course.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {enrollments.map((e) => (
        <Card key={e.id}>
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{e.course.title}</p>
                {e.status === "COMPLETED" ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500">
                    <CheckCircle2 className="size-3.5" /> Completed
                  </span>
                ) : (
                  <Badge variant="outline">{e.status === "IN_PROGRESS" ? "In Progress" : "Assigned"}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {e.course.category ?? "General"}
                {e.course.durationMinutes && ` · ${e.course.durationMinutes} min`}
                {e.quizScore != null && ` · Quiz: ${e.quizScore}% (${e.quizPassed ? "Passed" : "Failed"})`}
              </p>
              {e.status !== "COMPLETED" && <Progress value={e.progressPercent} className="mt-2 w-48" />}
            </div>
            <div className="flex items-center gap-2">
              {e.certificateIssuedAt && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/learning/enrollments/${e.id}/certificate`} target="_blank" rel="noreferrer">
                    <Award /> Certificate
                  </a>
                </Button>
              )}
              <Button size="sm" onClick={() => router.push(`/learning/courses/${e.course.id}/learn`)}>
                {e.status === "COMPLETED" ? "Review" : e.status === "ASSIGNED" ? "Start" : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
