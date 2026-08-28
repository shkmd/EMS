import { z } from "zod"

const optionalString = z.string().optional()

function numericString(label: string, min: number, max: number) {
  return z.string().min(1, `${label} is required`).refine((v) => {
    const n = Number(v)
    return !Number.isNaN(n) && Number.isInteger(n) && n >= min && n <= max
  }, `${label} must be a whole number between ${min} and ${max}`)
}

function optionalNumericString(label: string, min: number, max: number) {
  return z.string().optional().refine((v) => {
    if (!v) return true
    const n = Number(v)
    return !Number.isNaN(n) && Number.isInteger(n) && n >= min && n <= max
  }, `${label} must be a whole number between ${min} and ${max}`)
}

export const courseFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: optionalString,
  category: optionalString,
  durationMinutes: optionalNumericString("Duration", 1, 10000),
  skillGranted: optionalString,
  isPublished: z.boolean(),
})
export type CourseFormInput = z.infer<typeof courseFormSchema>

const quizQuestionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  options: z.array(z.string().min(1, "Option can't be empty")).min(2, "At least 2 options are required"),
  correctOptionIndex: numericString("Correct answer", 0, 50),
})

export const quizFormSchema = z.object({
  passingScore: numericString("Passing score", 1, 100),
  questions: z.array(quizQuestionSchema).min(1, "Add at least one question"),
})
export type QuizFormInput = z.infer<typeof quizFormSchema>
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>

export const enrollmentAssignSchema = z.object({
  employeeIds: z.array(z.string()).min(1, "Select at least one employee"),
})
export type EnrollmentAssignInput = z.infer<typeof enrollmentAssignSchema>

export const enrollmentProgressSchema = z.object({
  progressPercent: z.number().int().min(0).max(100),
})
export type EnrollmentProgressInput = z.infer<typeof enrollmentProgressSchema>

export const quizSubmitSchema = z.object({
  answers: z.array(z.number().int().min(0)),
})
export type QuizSubmitInput = z.infer<typeof quizSubmitSchema>

export const skillFormSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().min(1, "Skill name is required").max(100),
  proficiency: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  notes: optionalString,
})
export type SkillFormInput = z.infer<typeof skillFormSchema>
