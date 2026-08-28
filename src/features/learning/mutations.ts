import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import { notifyUser } from "@/lib/notify"
import { assertAllowedFile, deleteUploadedFile, saveUploadedFile, ALLOWED_DOCUMENT_MIME_TYPES } from "@/lib/storage"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageLearning } from "@/features/learning/authorization"
import type {
  CourseFormInput,
  QuizFormInput,
  EnrollmentAssignInput,
  EnrollmentProgressInput,
  QuizSubmitInput,
  SkillFormInput,
} from "@/features/learning/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

const ALLOWED_COURSE_CONTENT_MIME_TYPES = [
  ...ALLOWED_DOCUMENT_MIME_TYPES,
  "video/mp4",
  "video/webm",
  "video/quicktime",
]

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageLearning(viewer.role)) throw new ForbiddenError()
}

// ---------- Courses ----------

export async function createCourse(input: CourseFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const course = await prisma.course.create({
    data: {
      title: input.title,
      description: input.description || null,
      category: input.category || null,
      durationMinutes: input.durationMinutes ? Number(input.durationMinutes) : null,
      skillGranted: input.skillGranted || null,
      isPublished: input.isPublished,
      createdById: viewer.sub,
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "COURSE_CREATED", entityType: "Course", entityId: course.id, ...meta })
  return course
}

export async function updateCourse(id: string, input: CourseFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.course.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Course not found")

  const course = await prisma.course.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description || null,
      category: input.category || null,
      durationMinutes: input.durationMinutes ? Number(input.durationMinutes) : null,
      skillGranted: input.skillGranted || null,
      isPublished: input.isPublished,
    },
  })

  await recordAuditLog({ userId: viewer.sub, action: "COURSE_UPDATED", entityType: "Course", entityId: id, ...meta })
  return course
}

export async function deleteCourse(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.course.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Course not found")

  const enrollmentCount = await prisma.courseEnrollment.count({ where: { courseId: id } })
  if (enrollmentCount > 0) throw new ValidationError("This course has enrollments and can't be deleted — unpublish it instead")

  if (existing.contentUrl) await deleteUploadedFile(existing.contentUrl)
  await prisma.course.delete({ where: { id } })
  await recordAuditLog({ userId: viewer.sub, action: "COURSE_DELETED", entityType: "Course", entityId: id, ...meta })
}

export async function uploadCourseContent(courseId: string, file: File, viewer: AccessTokenPayload) {
  assertCanManage(viewer)

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw new NotFoundError("Course not found")

  assertAllowedFile(file, ALLOWED_COURSE_CONTENT_MIME_TYPES)
  const buffer = Buffer.from(await file.arrayBuffer())
  const { relativePath } = await saveUploadedFile(buffer, `courses/${courseId}`, file.name)

  if (course.contentUrl) await deleteUploadedFile(course.contentUrl)

  return prisma.course.update({ where: { id: courseId }, data: { contentUrl: relativePath, contentFileName: file.name } })
}

// ---------- Quiz ----------

export async function saveQuiz(courseId: string, input: QuizFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw new NotFoundError("Course not found")

  for (const q of input.questions) {
    const correctIndex = Number(q.correctOptionIndex)
    if (correctIndex >= q.options.length) throw new ValidationError("Correct answer must reference one of the listed options")
  }

  const quiz = await prisma.$transaction(async (tx) => {
    const upserted = await tx.quiz.upsert({
      where: { courseId },
      update: { passingScore: Number(input.passingScore) },
      create: { courseId, passingScore: Number(input.passingScore) },
    })
    await tx.quizQuestion.deleteMany({ where: { quizId: upserted.id } })
    await tx.quizQuestion.createMany({
      data: input.questions.map((q, i) => ({
        quizId: upserted.id,
        text: q.text,
        options: q.options,
        correctOptionIndex: Number(q.correctOptionIndex),
        position: i,
      })),
    })
    return upserted
  })

  await recordAuditLog({ userId: viewer.sub, action: "COURSE_QUIZ_SAVED", entityType: "Course", entityId: courseId, ...meta })
  return quiz
}

export async function deleteQuiz(courseId: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const quiz = await prisma.quiz.findUnique({ where: { courseId } })
  if (!quiz) throw new NotFoundError("Quiz not found")

  await prisma.quiz.delete({ where: { courseId } })
  await recordAuditLog({ userId: viewer.sub, action: "COURSE_QUIZ_DELETED", entityType: "Course", entityId: courseId, ...meta })
}

// ---------- Enrollments ----------

export async function assignEnrollments(courseId: string, input: EnrollmentAssignInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw new NotFoundError("Course not found")

  const employees = await prisma.employee.findMany({
    where: { id: { in: input.employeeIds }, deletedAt: null, status: "ACTIVE" },
    select: { id: true, userId: true },
  })
  if (employees.length !== input.employeeIds.length) throw new ValidationError("One or more employees are invalid")

  const existing = await prisma.courseEnrollment.findMany({
    where: { courseId, employeeId: { in: input.employeeIds } },
    select: { employeeId: true },
  })
  const alreadyEnrolled = new Set(existing.map((e) => e.employeeId))
  const toEnroll = employees.filter((e) => !alreadyEnrolled.has(e.id))

  if (toEnroll.length === 0) return []

  await prisma.courseEnrollment.createMany({
    data: toEnroll.map((e) => ({ courseId, employeeId: e.id, assignedById: viewer.sub })),
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "COURSE_ENROLLMENTS_ASSIGNED",
    entityType: "Course",
    entityId: courseId,
    metadata: { employeeIds: toEnroll.map((e) => e.id) },
    ...meta,
  })

  await Promise.all(
    toEnroll
      .filter((e) => e.userId)
      .map((e) => notifyUser(e.userId!, e.id, "New training assigned", `You've been assigned "${course.title}"`, `/learning/courses/${courseId}`))
  )

  return toEnroll
}

/** Any employee can enroll themselves in a published course from the
 * catalog — distinct from assignEnrollments, which is HR pushing training
 * onto someone. */
export async function selfEnroll(courseId: string, viewer: AccessTokenPayload, meta: Meta) {
  const employeeId = requireSelfEmployee(viewer)

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw new NotFoundError("Course not found")
  if (!course.isPublished) throw new ForbiddenError()

  const existing = await prisma.courseEnrollment.findUnique({ where: { courseId_employeeId: { courseId, employeeId } } })
  if (existing) throw new ValidationError("You're already enrolled in this course")

  const enrollment = await prisma.courseEnrollment.create({
    data: { courseId, employeeId, assignedById: viewer.sub },
  })

  await recordAuditLog({ userId: viewer.sub, action: "COURSE_SELF_ENROLLED", entityType: "CourseEnrollment", entityId: enrollment.id, ...meta })
  return enrollment
}

export async function removeEnrollment(id: string, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.courseEnrollment.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Enrollment not found")

  await prisma.courseEnrollment.delete({ where: { id } })
  await recordAuditLog({ userId: viewer.sub, action: "COURSE_ENROLLMENT_REMOVED", entityType: "CourseEnrollment", entityId: id, ...meta })
}

function requireSelfEmployee(viewer: AccessTokenPayload) {
  if (!viewer.employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")
  return viewer.employeeId
}

async function requireOwnEnrollment(id: string, viewer: AccessTokenPayload) {
  const enrollment = await prisma.courseEnrollment.findUnique({ where: { id }, include: { course: true } })
  if (!enrollment) throw new NotFoundError("Enrollment not found")
  if (enrollment.employeeId !== requireSelfEmployee(viewer)) throw new ForbiddenError()
  return enrollment
}

/** Marks a course fully done: sets status/completedAt/certificate, and — if
 * the course grants a skill — upserts that EmployeeSkill for the learner. A
 * genuinely small link between the course catalog and the skill matrix. */
async function completeEnrollment(enrollmentId: string, employeeId: string, skillGranted: string | null) {
  await prisma.$transaction(async (tx) => {
    await tx.courseEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "COMPLETED", progressPercent: 100, completedAt: new Date(), certificateIssuedAt: new Date() },
    })
    if (skillGranted) {
      await tx.employeeSkill.upsert({
        where: { employeeId_name: { employeeId, name: skillGranted } },
        update: {},
        create: { employeeId, name: skillGranted, proficiency: "BEGINNER" },
      })
    }
  })
}

export async function startEnrollment(id: string, viewer: AccessTokenPayload, meta: Meta) {
  const enrollment = await requireOwnEnrollment(id, viewer)
  if (enrollment.status !== "ASSIGNED") return enrollment

  const updated = await prisma.courseEnrollment.update({ where: { id }, data: { status: "IN_PROGRESS", startedAt: new Date() } })
  await recordAuditLog({ userId: viewer.sub, action: "COURSE_STARTED", entityType: "CourseEnrollment", entityId: id, ...meta })
  return updated
}

export async function updateEnrollmentProgress(id: string, input: EnrollmentProgressInput, viewer: AccessTokenPayload, meta: Meta) {
  const enrollment = await requireOwnEnrollment(id, viewer)
  if (enrollment.status === "COMPLETED") return enrollment

  const updated = await prisma.courseEnrollment.update({
    where: { id },
    data: { progressPercent: input.progressPercent, status: "IN_PROGRESS", startedAt: enrollment.startedAt ?? new Date() },
  })

  // A course with no quiz is "done" the moment content progress hits 100%;
  // one with a quiz still needs a passing attempt (see submitQuiz below).
  if (input.progressPercent >= 100 && !(await prisma.quiz.findUnique({ where: { courseId: enrollment.courseId } }))) {
    await completeEnrollment(id, enrollment.employeeId, enrollment.course.skillGranted)
    await recordAuditLog({ userId: viewer.sub, action: "COURSE_COMPLETED", entityType: "CourseEnrollment", entityId: id, ...meta })
    return prisma.courseEnrollment.findUniqueOrThrow({ where: { id } })
  }

  return updated
}

export async function submitQuiz(enrollmentId: string, input: QuizSubmitInput, viewer: AccessTokenPayload, meta: Meta) {
  const enrollment = await requireOwnEnrollment(enrollmentId, viewer)

  const quiz = await prisma.quiz.findUnique({
    where: { courseId: enrollment.courseId },
    include: { questions: { orderBy: { position: "asc" } } },
  })
  if (!quiz) throw new ValidationError("This course has no quiz")
  if (input.answers.length !== quiz.questions.length) throw new ValidationError("Answer every question before submitting")

  const correctCount = quiz.questions.reduce((count, q, i) => (input.answers[i] === q.correctOptionIndex ? count + 1 : count), 0)
  const score = Math.round((correctCount / quiz.questions.length) * 100)
  const passed = score >= quiz.passingScore

  await prisma.courseEnrollment.update({
    where: { id: enrollmentId },
    data: { quizScore: score, quizPassed: passed, status: passed ? "IN_PROGRESS" : enrollment.status },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "COURSE_QUIZ_SUBMITTED",
    entityType: "CourseEnrollment",
    entityId: enrollmentId,
    metadata: { score, passed },
    ...meta,
  })

  if (passed) {
    await completeEnrollment(enrollmentId, enrollment.employeeId, enrollment.course.skillGranted)
  }

  return { score, passed, passingScore: quiz.passingScore }
}

// ---------- Skills ----------

function assertCanEditSkill(viewer: AccessTokenPayload, employeeId: string) {
  if (canManageLearning(viewer.role)) return
  if (viewer.employeeId === employeeId) return
  throw new ForbiddenError()
}

export async function upsertSkill(input: SkillFormInput, viewer: AccessTokenPayload, meta: Meta) {
  assertCanEditSkill(viewer, input.employeeId)

  const skill = await prisma.employeeSkill.upsert({
    where: { employeeId_name: { employeeId: input.employeeId, name: input.name } },
    update: { proficiency: input.proficiency, notes: input.notes || null },
    create: { employeeId: input.employeeId, name: input.name, proficiency: input.proficiency, notes: input.notes || null },
  })

  await recordAuditLog({ userId: viewer.sub, action: "EMPLOYEE_SKILL_UPSERTED", entityType: "EmployeeSkill", entityId: skill.id, ...meta })
  return skill
}

export async function deleteSkill(id: string, viewer: AccessTokenPayload, meta: Meta) {
  const skill = await prisma.employeeSkill.findUnique({ where: { id } })
  if (!skill) throw new NotFoundError("Skill not found")
  assertCanEditSkill(viewer, skill.employeeId)

  await prisma.employeeSkill.delete({ where: { id } })
  await recordAuditLog({ userId: viewer.sub, action: "EMPLOYEE_SKILL_DELETED", entityType: "EmployeeSkill", entityId: id, ...meta })
}
