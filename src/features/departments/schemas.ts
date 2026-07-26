import { z } from "zod"

export const departmentFormSchema = z.object({
  name: z.string().min(1, "Department name is required").max(150),
  description: z.string().optional(),
  headId: z.string().optional(),
})
export type DepartmentFormInput = z.infer<typeof departmentFormSchema>
