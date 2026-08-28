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

export const jobOpeningFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  departmentId: optionalString,
  designationId: optionalString,
  verticalId: optionalString,
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]),
  numberOfPositions: numericString("Number of positions", 1, 999),
  description: optionalString,
  requirements: optionalString,
})
export type JobOpeningFormInput = z.infer<typeof jobOpeningFormSchema>

export const jobOpeningStatusUpdateSchema = z.object({
  status: z.enum(["OPEN", "ON_HOLD", "CLOSED", "FILLED"]),
})
export type JobOpeningStatusUpdateInput = z.infer<typeof jobOpeningStatusUpdateSchema>

export const candidateCreateSchema = z.object({
  jobOpeningId: z.string().min(1),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.email("Enter a valid email"),
  phone: optionalString,
  source: optionalString,
  coverLetter: optionalString,
})
export type CandidateCreateInput = z.infer<typeof candidateCreateSchema>

const candidateStageValues = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED", "WITHDRAWN"] as const

export const candidateStageUpdateSchema = z
  .object({
    stage: z.enum(candidateStageValues),
    rejectionReason: optionalString,
  })
  .refine((data) => data.stage !== "REJECTED" || !!data.rejectionReason, {
    message: "A reason is required when rejecting a candidate",
    path: ["rejectionReason"],
  })
export type CandidateStageUpdateInput = z.infer<typeof candidateStageUpdateSchema>

export const candidateHireSchema = z.object({
  employeeId: z.string().min(1),
})
export type CandidateHireInput = z.infer<typeof candidateHireSchema>

export const interviewFormSchema = z.object({
  roundName: z.string().min(1, "Round name is required").max(100),
  scheduledAt: z.string().min(1, "Date & time is required"),
  durationMinutes: optionalNumericString("Duration", 5, 480),
  location: optionalString,
  panelistIds: z.array(z.string()).min(1, "Select at least one panelist"),
})
export type InterviewFormInput = z.infer<typeof interviewFormSchema>

export const interviewStatusUpdateSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"]),
})
export type InterviewStatusUpdateInput = z.infer<typeof interviewStatusUpdateSchema>

export const interviewFeedbackSchema = z.object({
  rating: numericString("Rating", 1, 5),
  recommendation: z.enum(["STRONG_YES", "YES", "NO", "STRONG_NO"]),
  comments: optionalString,
})
export type InterviewFeedbackInput = z.infer<typeof interviewFeedbackSchema>
