"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Pencil, Trash2, UploadCloud, UserPlus } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"
import { initials } from "@/features/messaging/lib/initials"
import { CourseFormDialog, type CourseEditTarget } from "@/features/learning/components/course-form-dialog"
import { QuizBuilder } from "@/features/learning/components/quiz-builder"
import { AssignEmployeesDialog } from "@/features/learning/components/assign-employees-dialog"

type Question = { id: string; text: string; options: unknown; correctOptionIndex: number; position: number }
type Course = {
  id: string
  title: string
  description: string | null
  category: string | null
  durationMinutes: number | null
  contentUrl: string | null
  contentFileName: string | null
  skillGranted: string | null
  isPublished: boolean
  quiz: { id: string; passingScore: number; questions: Question[] } | null
}
type EnrollmentRow = {
  id: string
  status: string
  progressPercent: number
  quizScore: number | null
  quizPassed: boolean | null
  employee: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null }
}

export function CourseManageDetail({ initialCourse, initialEnrollments }: { initialCourse: Course; initialEnrollments: EnrollmentRow[] }) {
  const [course, setCourse] = useState(initialCourse)
  const [enrollments, setEnrollments] = useState(initialEnrollments)
  const [editOpen, setEditOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  function reloadCourse() {
    apiFetch<{ course: Course }>(`/api/learning/courses/${course.id}`).then((r) => r.success && setCourse(r.data.course))
  }

  function reloadEnrollments() {
    apiFetch<{ enrollments: EnrollmentRow[] }>(`/api/learning/courses/${course.id}/enrollments`).then((r) => r.success && setEnrollments(r.data.enrollments))
  }

  async function handleContentUpload(file: File) {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/learning/courses/${course.id}/content`, { method: "POST", body: formData, credentials: "include" })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error?.message ?? "Upload failed")
        return
      }
      toast.success("Content uploaded")
      reloadCourse()
    } finally {
      setIsUploading(false)
    }
  }

  async function handleRemoveEnrollment(id: string) {
    const result = await apiFetch(`/api/learning/enrollments/${id}`, { method: "DELETE" })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    reloadEnrollments()
  }

  const editTarget: CourseEditTarget = {
    id: course.id,
    title: course.title,
    description: course.description,
    category: course.category,
    durationMinutes: course.durationMinutes,
    skillGranted: course.skillGranted,
    isPublished: course.isPublished,
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>{course.title}</CardTitle>
              <Badge className={course.isPublished ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}>
                {course.isPublished ? "Published" : "Draft"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {course.category ?? "Uncategorized"}
              {course.durationMinutes && ` · ${course.durationMinutes} min`}
              {course.skillGranted && ` · Grants "${course.skillGranted}"`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil /> Edit
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {course.description && <p className="text-sm">{course.description}</p>}
          <div className="flex items-center gap-2">
            {course.contentUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/learning/courses/${course.id}/content`} target="_blank" rel="noreferrer">
                  {course.contentFileName ?? "View content"}
                </a>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">No content uploaded yet.</span>
            )}
            <label>
              <Button variant="outline" size="sm" disabled={isUploading} asChild>
                <span className="cursor-pointer">
                  {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                  {course.contentUrl ? "Replace content" : "Upload content"}
                </span>
              </Button>
              <input
                type="file"
                accept="video/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleContentUpload(e.target.files[0])}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <QuizBuilder courseId={course.id} existingQuiz={course.quiz} onSaved={reloadCourse} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Enrolled Employees</CardTitle>
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            <UserPlus /> Assign
          </Button>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one is enrolled yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Quiz</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            {e.employee.profilePhotoUrl && <AvatarImage src={`/api/employees/${e.employee.id}/photo`} />}
                            <AvatarFallback className="text-xs">{initials(`${e.employee.firstName} ${e.employee.lastName}`)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {e.employee.firstName} {e.employee.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="w-40">
                        <div className="flex items-center gap-2">
                          <Progress value={e.progressPercent} className="w-24" />
                          <span className="text-xs text-muted-foreground">{e.progressPercent}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {e.status === "COMPLETED" ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500">
                            <CheckCircle2 className="size-3.5" /> Completed
                          </span>
                        ) : (
                          <Badge variant="outline">{e.status === "IN_PROGRESS" ? "In Progress" : "Assigned"}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{e.quizScore != null ? `${e.quizScore}% ${e.quizPassed ? "(Passed)" : "(Failed)"}` : "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => handleRemoveEnrollment(e.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CourseFormDialog target={editTarget} open={editOpen} onOpenChange={setEditOpen} onSaved={reloadCourse} />
      <AssignEmployeesDialog
        courseId={course.id}
        alreadyEnrolledIds={enrollments.map((e) => e.employee.id)}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onSaved={reloadEnrollments}
      />
    </div>
  )
}
