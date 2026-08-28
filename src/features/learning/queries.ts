import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageLearning } from "@/features/learning/authorization"

const courseListSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  durationMinutes: true,
  skillGranted: true,
  isPublished: true,
  createdAt: true,
  quiz: { select: { id: true } },
  _count: { select: { enrollments: true } },
} satisfies import("@prisma/client").Prisma.CourseSelect

export async function listCourses(viewer: AccessTokenPayload, includeUnpublished = false) {
  const canManage = canManageLearning(viewer.role)
  return prisma.course.findMany({
    where: includeUnpublished && canManage ? {} : { isPublished: true },
    select: courseListSelect,
    orderBy: { createdAt: "desc" },
  })
}

export async function listCoursesForManage(viewer: AccessTokenPayload) {
  if (!canManageLearning(viewer.role)) throw new ForbiddenError()
  return prisma.course.findMany({ select: courseListSelect, orderBy: { createdAt: "desc" } })
}

/** Course detail for the admin authoring view — includes quiz answers. */
export async function getCourseForManage(id: string, viewer: AccessTokenPayload) {
  if (!canManageLearning(viewer.role)) throw new ForbiddenError()
  const course = await prisma.course.findUnique({
    where: { id },
    include: { quiz: { include: { questions: { orderBy: { position: "asc" } } } } },
  })
  if (!course) throw new NotFoundError("Course not found")
  return course
}

/** Course detail for a learner — quiz questions are stripped of the correct
 * answer so it can't be read off the network response while taking it. */
export async function getCourseForLearner(id: string, viewer: AccessTokenPayload) {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      quiz: { include: { questions: { orderBy: { position: "asc" }, select: { id: true, text: true, options: true, position: true } } } },
    },
  })
  if (!course) throw new NotFoundError("Course not found")
  if (!course.isPublished && !canManageLearning(viewer.role)) throw new ForbiddenError()

  const enrollment = viewer.employeeId
    ? await prisma.courseEnrollment.findUnique({ where: { courseId_employeeId: { courseId: id, employeeId: viewer.employeeId } } })
    : null

  return { course, enrollment }
}

export async function listMyEnrollments(viewer: AccessTokenPayload) {
  if (!viewer.employeeId) return []
  return prisma.courseEnrollment.findMany({
    where: { employeeId: viewer.employeeId },
    include: { course: { select: { id: true, title: true, category: true, durationMinutes: true } } },
    orderBy: { assignedAt: "desc" },
  })
}

export async function listEnrollmentsForCourse(courseId: string, viewer: AccessTokenPayload) {
  if (!canManageLearning(viewer.role)) throw new ForbiddenError()
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })
  if (!course) throw new NotFoundError("Course not found")

  return prisma.courseEnrollment.findMany({
    where: { courseId },
    include: { employee: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } } },
    orderBy: { assignedAt: "desc" },
  })
}

export async function getEnrollment(id: string, viewer: AccessTokenPayload) {
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id },
    include: { course: { select: { id: true, title: true, skillGranted: true } }, employee: { select: { id: true, firstName: true, lastName: true } } },
  })
  if (!enrollment) throw new NotFoundError("Enrollment not found")
  if (!canManageLearning(viewer.role) && enrollment.employeeId !== viewer.employeeId) throw new ForbiddenError()
  return enrollment
}

export async function listSkillsForEmployee(employeeId: string, viewer: AccessTokenPayload) {
  if (!canManageLearning(viewer.role) && viewer.employeeId !== employeeId) throw new ForbiddenError()
  return prisma.employeeSkill.findMany({ where: { employeeId }, orderBy: { name: "asc" } })
}

/** Company-wide skill matrix — every employee's skills, for HR/admin review. */
export async function listSkillMatrix(viewer: AccessTokenPayload) {
  if (!canManageLearning(viewer.role)) throw new ForbiddenError()
  return prisma.employeeSkill.findMany({
    include: { employee: { select: { id: true, firstName: true, lastName: true, department: { select: { name: true } } } } },
    orderBy: [{ employee: { firstName: "asc" } }, { name: "asc" }],
  })
}
