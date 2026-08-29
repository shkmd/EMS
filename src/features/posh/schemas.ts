import { z } from "zod"

const optionalString = z.string().optional()

export const committeeMemberFormSchema = z.object({
  employeeId: z.string().min(1, "Select an employee"),
  isPresidingOfficer: z.boolean(),
})
export type CommitteeMemberFormInput = z.infer<typeof committeeMemberFormSchema>

export const caseFileSchema = z.object({
  respondentName: z.string().min(1, "Respondent name is required").max(200),
  respondentEmployeeId: optionalString,
  incidentDate: optionalString,
  description: z.string().min(1, "Please describe the incident").max(10000),
})
export type CaseFileInput = z.infer<typeof caseFileSchema>

export const caseAssignSchema = z.object({
  committeeMemberIds: z.array(z.string()).min(1, "Select at least one committee member"),
})
export type CaseAssignInput = z.infer<typeof caseAssignSchema>

export const caseStatusUpdateSchema = z
  .object({
    status: z.enum(["UNDER_REVIEW", "INQUIRY_IN_PROGRESS", "RESOLVED", "DISMISSED"]),
    outcome: optionalString,
  })
  .refine((v) => (v.status === "RESOLVED" || v.status === "DISMISSED" ? !!v.outcome?.trim() : true), {
    message: "An outcome is required to resolve or dismiss a case",
    path: ["outcome"],
  })
export type CaseStatusUpdateInput = z.infer<typeof caseStatusUpdateSchema>

export const caseUpdateNoteSchema = z.object({
  note: z.string().min(1, "Note can't be empty").max(5000),
})
export type CaseUpdateNoteInput = z.infer<typeof caseUpdateNoteSchema>
