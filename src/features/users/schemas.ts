import { z } from "zod"

const roleEnum = z.enum(["SUPER_ADMIN", "HR", "MANAGER", "EMPLOYEE"])

export const createUserSchema = z.object({
  email: z.email("Enter a valid email"),
  role: roleEnum,
  employeeId: z.string().optional(),
})
export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  role: roleEnum.optional(),
  isActive: z.boolean().optional(),
})
export type UpdateUserInput = z.infer<typeof updateUserSchema>
