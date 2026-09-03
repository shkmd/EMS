import { format } from "date-fns"

import type { EmployeeFormInput } from "@/features/employees/schemas"

type EmployeeRecord = {
  firstName: string
  lastName: string
  gender: string | null
  dob: Date | null
  bloodGroup: string | null
  maritalStatus: string | null
  mobile: string
  alternateMobile: string | null
  email: string
  personalEmail: string | null
  currentAddress: string | null
  permanentAddress: string | null
  city: string | null
  state: string | null
  country: string | null
  pincode: string | null
  departmentId: string | null
  designationId: string | null
  verticalId: string | null
  reportingManagerId: string | null
  employmentType: string
  workMode: string
  dateOfJoining: Date
  probationPeriodMonths: number | null
  confirmationDate: Date | null
  workLocation: string | null
  shift: string | null
  biometricId: string | null
  status: string
  basicSalary: { toString(): string } | null
  allowances: { toString(): string } | null
  bankName: string | null
  bankAccountNo: string | null
  bankIfsc: string | null
  pan: string | null
  aadhaar: string | null
  pfNumber: string | null
  esiNumber: string | null
  emergencyContactName: string | null
  emergencyContactRelationship: string | null
  emergencyContactPhone: string | null
}

function dateInput(d: Date | null) {
  return d ? format(d, "yyyy-MM-dd") : ""
}

export function employeeToFormValues(employee: EmployeeRecord): EmployeeFormInput {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    gender: employee.gender ?? "",
    dob: dateInput(employee.dob),
    bloodGroup: employee.bloodGroup ?? "",
    maritalStatus: employee.maritalStatus ?? "",
    mobile: employee.mobile,
    alternateMobile: employee.alternateMobile ?? "",
    email: employee.email,
    personalEmail: employee.personalEmail ?? "",
    currentAddress: employee.currentAddress ?? "",
    permanentAddress: employee.permanentAddress ?? "",
    city: employee.city ?? "",
    state: employee.state ?? "",
    country: employee.country ?? "",
    pincode: employee.pincode ?? "",
    departmentId: employee.departmentId ?? "",
    designationId: employee.designationId ?? "",
    verticalId: employee.verticalId ?? "",
    reportingManagerId: employee.reportingManagerId ?? "",
    employmentType: employee.employmentType as EmployeeFormInput["employmentType"],
    workMode: employee.workMode as EmployeeFormInput["workMode"],
    dateOfJoining: dateInput(employee.dateOfJoining),
    probationPeriodMonths: employee.probationPeriodMonths?.toString() ?? "",
    confirmationDate: dateInput(employee.confirmationDate),
    workLocation: employee.workLocation ?? "",
    shift: employee.shift ?? "",
    biometricId: employee.biometricId ?? "",
    status: employee.status as EmployeeFormInput["status"],
    basicSalary: employee.basicSalary?.toString() ?? "",
    allowances: employee.allowances?.toString() ?? "",
    bankName: employee.bankName ?? "",
    bankAccountNo: employee.bankAccountNo ?? "",
    bankIfsc: employee.bankIfsc ?? "",
    pan: employee.pan ?? "",
    aadhaar: employee.aadhaar ?? "",
    pfNumber: employee.pfNumber ?? "",
    esiNumber: employee.esiNumber ?? "",
    emergencyContactName: employee.emergencyContactName ?? "",
    emergencyContactRelationship: employee.emergencyContactRelationship ?? "",
    emergencyContactPhone: employee.emergencyContactPhone ?? "",
  }
}
