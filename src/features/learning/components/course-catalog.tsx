"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch } from "@/lib/api-client"

type CatalogCourse = {
  id: string
  title: string
  description: string | null
  category: string | null
  durationMinutes: number | null
  quiz: { id: string } | null
}

export function CourseCatalog({ initialCourses, myCourseIds }: { initialCourses: CatalogCourse[]; myCourseIds: string[] }) {
  const router = useRouter()
  const [enrolledIds, setEnrolledIds] = useState(new Set(myCourseIds))
  const [enrollingId, setEnrollingId] = useState<string | null>(null)

  async function handleEnroll(courseId: string) {
    setEnrollingId(courseId)
    try {
      const result = await apiFetch(`/api/learning/courses/${courseId}/enroll`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Enrolled")
      setEnrolledIds((prev) => new Set(prev).add(courseId))
      router.push(`/learning/courses/${courseId}/learn`)
    } finally {
      setEnrollingId(null)
    }
  }

  if (initialCourses.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No courses are published yet.</p>
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {initialCourses.map((course) => {
        const isEnrolled = enrolledIds.has(course.id)
        return (
          <Card key={course.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{course.title}</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                {course.category ?? "General"}
                {course.durationMinutes && ` · ${course.durationMinutes} min`}
                {course.quiz && " · Includes quiz"}
              </p>
            </CardHeader>
            <CardContent className="flex-1">
              {course.description && <p className="line-clamp-3 text-sm text-muted-foreground">{course.description}</p>}
            </CardContent>
            <CardFooter>
              {isEnrolled ? (
                <Button variant="outline" className="w-full" onClick={() => router.push(`/learning/courses/${course.id}/learn`)}>
                  Go to course
                </Button>
              ) : (
                <Button className="w-full" disabled={enrollingId === course.id} onClick={() => handleEnroll(course.id)}>
                  {enrollingId === course.id && <Loader2 className="animate-spin" />}
                  Enroll
                </Button>
              )}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
