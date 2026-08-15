import { z } from "zod"

export const employeeDocumentGenerateTypeValues = ["RELIEVING_LETTER", "EXPERIENCE_CERTIFICATE", "SALARY_CERTIFICATE"] as const

export const generateEmployeeDocumentSchema = z.object({
  type: z.enum(employeeDocumentGenerateTypeValues),
})
export type GenerateEmployeeDocumentInput = z.infer<typeof generateEmployeeDocumentSchema>

export const offerLetterSchema = z.object({
  candidateName: z.string().min(1, "Candidate name is required").max(150),
  position: z.string().min(1, "Position is required").max(150),
  departmentId: z.string().optional(),
  proposedSalary: z.string().min(1, "Proposed salary is required"),
  joiningDate: z.string().min(1, "Joining date is required"),
  validUntil: z.string().optional(),
})
export type OfferLetterInput = z.infer<typeof offerLetterSchema>
