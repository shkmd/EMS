"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Award, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { apiFetch } from "@/lib/api-client"
import { QuizTaker } from "@/features/learning/components/quiz-taker"

type Question = { id: string; text: string; options: unknown; position: number }
type Course = {
  id: string
  title: string
  description: string | null
  contentUrl: string | null
  contentFileName: string | null
  quiz: { id: string; passingScore: number; questions: Question[] } | null
}
type Enrollment = {
  id: string
  status: string
  progressPercent: number
  quizScore: number | null
  quizPassed: boolean | null
  certificateIssuedAt: string | null
} | null

export function CourseLearnerView({ course, initialEnrollment }: { course: Course; initialEnrollment: Enrollment }) {
  const [enrollment, setEnrollment] = useState(initialEnrollment)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [isMarking, setIsMarking] = useState(false)

  async function handleEnroll() {
    setIsEnrolling(true)
    try {
      const result = await apiFetch<{ enrollment: NonNullable<Enrollment> }>(`/api/learning/courses/${course.id}/enroll`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      setEnrollment(result.data.enrollment)
    } finally {
      setIsEnrolling(false)
    }
  }

  async function handleMarkComplete() {
    if (!enrollment) return
    setIsMarking(true)
    try {
      if (enrollment.status === "ASSIGNED") {
        await apiFetch(`/api/learning/enrollments/${enrollment.id}/start`, { method: "POST" })
      }
      const result = await apiFetch<{ enrollment: NonNullable<Enrollment> }>(`/api/learning/enrollments/${enrollment.id}/progress`, {
        method: "PATCH",
        body: { progressPercent: 100 },
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      setEnrollment(result.data.enrollment)
      if (result.data.enrollment.status === "COMPLETED") toast.success("Course completed")
    } finally {
      setIsMarking(false)
    }
  }

  if (!enrollment) {
    return (
      <div className="flex flex-col gap-6">
        <CourseHeader course={course} />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">You&apos;re not enrolled in this course yet.</p>
            <Button onClick={handleEnroll} disabled={isEnrolling}>
              {isEnrolling && <Loader2 className="animate-spin" />}
              Enroll
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasQuiz = !!course.quiz
  const contentDone = enrollment.status === "COMPLETED" || enrollment.progressPercent >= 100
  const needsQuiz = hasQuiz && enrollment.status !== "COMPLETED"

  return (
    <div className="flex flex-col gap-6">
      <CourseHeader course={course} />

      <Card>
        <CardContent className="flex flex-col gap-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Your progress</p>
              <p className="text-xs text-muted-foreground">
                {enrollment.status === "COMPLETED" ? "Completed" : enrollment.status === "IN_PROGRESS" ? "In progress" : "Not started"}
              </p>
            </div>
            <span className="text-sm text-muted-foreground">{enrollment.progressPercent}%</span>
          </div>
          <Progress value={enrollment.progressPercent} />

          {course.contentUrl && (
            <Button variant="outline" className="w-fit" asChild>
              <a href={`/api/learning/courses/${course.id}/content`} target="_blank" rel="noreferrer">
                {course.contentFileName ?? "Open course content"}
              </a>
            </Button>
          )}

          {!contentDone && (
            <Button className="w-fit" onClick={handleMarkComplete} disabled={isMarking}>
              {isMarking && <Loader2 className="animate-spin" />}
              Mark content as complete
            </Button>
          )}

          {enrollment.certificateIssuedAt && (
            <Button variant="outline" className="w-fit" asChild>
              <a href={`/api/learning/enrollments/${enrollment.id}/certificate`} target="_blank" rel="noreferrer">
                <Award /> Download certificate
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {needsQuiz && contentDone && course.quiz && (
        <QuizTaker
          enrollmentId={enrollment.id}
          questions={course.quiz.questions.map((q) => ({ id: q.id, text: q.text, options: q.options as string[], position: q.position }))}
          passingScore={course.quiz.passingScore}
          onResult={(result) =>
            setEnrollment((prev) => (prev ? { ...prev, quizScore: result.score, quizPassed: result.passed, status: result.passed ? "COMPLETED" : prev.status } : prev))
          }
        />
      )}
    </div>
  )
}

function CourseHeader({ course }: { course: Course }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
        {course.quiz && <Badge variant="outline">Includes quiz</Badge>}
      </div>
      {course.description && <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>}
    </div>
  )
}
