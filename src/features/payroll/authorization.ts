import type { Role } from "@prisma/client"

import type { AccessTokenPayload } from "@/lib/jwt"

export const PAYROLL_MANAGE_ROLES: Role[] = ["SUPER_ADMIN", "HR"]

export function canManagePayroll(role: Role) {
  return PAYROLL_MANAGE_ROLES.includes(role)
}

/** Whether the viewer may view a specific employee's payslip. */
export function canViewPayslip(viewer: AccessTokenPayload, employeeId: string) {
  if (canManagePayroll(viewer.role)) return true
  return viewer.employeeId === employeeId
}
