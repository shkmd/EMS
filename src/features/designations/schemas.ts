import { z } from "zod"

export const designationFormSchema = z.object({
  title: z.string().min(1, "Designation title is required").max(150),
  departmentId: z.string().optional(),
  description: z.string().optional(),
})
export type DesignationFormInput = z.infer<typeof designationFormSchema>
