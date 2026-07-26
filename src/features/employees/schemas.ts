import { z } from "zod"

// Every field here is deliberately typed as a plain string (or optional
// string) matching what native form inputs actually produce — no
// `z.coerce`/`z.preprocess`, which would make the schema's *input* type
// `unknown` and break `useForm<T>` + `zodResolver` (react-hook-form needs
// the schema's input type to match the form's field-value type; coercion
// happens later, in the mutation layer, right before the Prisma write).

const optionalString = z.string().optional()

function optionalEnum<T extends string>(values: readonly T[], label: string) {
  return z.string().optional().refine((v) => !v || (values as readonly string[]).includes(v), `Invalid ${label}`)
}

function optionalNumericString(label: string) {
  return z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), `${label} must be a number`)
}

export const employeeFormSchema = z.object({
  // Personal
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  gender: optionalEnum(["MALE", "FEMALE", "OTHER"], "gender"),
  dob: optionalString,
  bloodGroup: optionalEnum(
    ["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"],
    "blood group"
  ),
  maritalStatus: optionalEnum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"], "marital status"),

  // Contact
  mobile: z.string().min(7, "Enter a valid mobile number").max(20),
  alternateMobile: optionalString,
  email: z.email("Enter a valid work email"),
  personalEmail: z.string().optional().refine((v) => !v || z.email().safeParse(v).success, "Enter a valid personal email"),

  // Address
  currentAddress: optionalString,
  permanentAddress: optionalString,
  city: optionalString,
  state: optionalString,
  country: optionalString,
  pincode: optionalString,

  // Employment
  departmentId: optionalString,
  designationId: optionalString,
  verticalId: optionalString,
  reportingManagerId: optionalString,
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]),
  dateOfJoining: z.string().min(1, "Date of joining is required"),
  probationPeriodMonths: optionalNumericString("Probation period"),
  confirmationDate: optionalString,
  workLocation: optionalString,
  shift: optionalString,
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]),

  // Salary
  basicSalary: optionalNumericString("Basic salary"),
  allowances: optionalNumericString("Allowances"),
  bankName: optionalString,
  bankAccountNo: optionalString,
  bankIfsc: optionalString,
  pan: optionalString,
  aadhaar: optionalString,
  pfNumber: optionalString,
  esiNumber: optionalString,

  // Emergency contact
  emergencyContactName: optionalString,
  emergencyContactRelationship: optionalString,
  emergencyContactPhone: optionalString,
})
export type EmployeeFormInput = z.infer<typeof employeeFormSchema>

export const employeeStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]),
})
export type EmployeeStatusInput = z.infer<typeof employeeStatusSchema>

export const accountAccessSchema = z
  .object({
    enabled: z.boolean(),
    role: z.enum(["SUPER_ADMIN", "HR", "MANAGER", "EMPLOYEE"]).optional(),
  })
  .refine((v) => !v.enabled || !!v.role, { message: "Role is required", path: ["role"] })
export type AccountAccessInput = z.infer<typeof accountAccessSchema>

export const employeeNoteSchema = z.object({
  note: z.string().min(1, "Note cannot be empty").max(4000),
})
export type EmployeeNoteInput = z.infer<typeof employeeNoteSchema>

export const employeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  departmentId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]).optional(),
  sortBy: z.enum(["name", "employeeCode", "dateOfJoining", "department"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
})
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>

export const documentTypeValues = [
  "RESUME",
  "OFFER_LETTER",
  "APPOINTMENT_LETTER",
  "ID_PROOF",
  "ADDRESS_PROOF",
  "EDUCATIONAL_CERTIFICATE",
  "EXPERIENCE_CERTIFICATE",
  "OTHER",
] as const
