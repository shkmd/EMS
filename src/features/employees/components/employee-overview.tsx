import { format } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  )
}

function dateStr(d: Date | string | null) {
  return d ? format(new Date(d), "dd MMM yyyy") : null
}

export type EmployeeOverviewData = {
  gender: string | null
  dob: Date | string | null
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
  department: { name: string } | null
  designation: { title: string } | null
  reportingManager: { firstName: string; lastName: string } | null
  employmentType: string
  workMode: string
  dateOfJoining: Date | string
  probationPeriodMonths: number | null
  confirmationDate: Date | string | null
  workLocation: string | null
  shift: string | null
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

export function EmployeeOverview({ employee }: { employee: EmployeeOverviewData }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Gender" value={employee.gender} />
          <Field label="Date of birth" value={dateStr(employee.dob)} />
          <Field label="Blood group" value={employee.bloodGroup?.replace(/_/g, " ")} />
          <Field label="Marital status" value={employee.maritalStatus} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Mobile" value={employee.mobile} />
          <Field label="Alternate mobile" value={employee.alternateMobile} />
          <Field label="Work email" value={employee.email} />
          <Field label="Personal email" value={employee.personalEmail} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Current address" value={employee.currentAddress} />
          <Field label="Permanent address" value={employee.permanentAddress} />
          <Field label="City" value={employee.city} />
          <Field label="State" value={employee.state} />
          <Field label="Country" value={employee.country} />
          <Field label="Pincode" value={employee.pincode} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employment</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Department" value={employee.department?.name} />
          <Field label="Designation" value={employee.designation?.title} />
          <Field
            label="Reporting manager"
            value={employee.reportingManager && `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}`}
          />
          <Field label="Employment type" value={employee.employmentType.replace("_", " ")} />
          <Field label="Work mode" value={employee.workMode} />
          <Field label="Date of joining" value={dateStr(employee.dateOfJoining)} />
          <Field label="Probation period" value={employee.probationPeriodMonths ? `${employee.probationPeriodMonths} months` : null} />
          <Field label="Confirmation date" value={dateStr(employee.confirmationDate)} />
          <Field label="Work location" value={employee.workLocation} />
          <Field label="Shift" value={employee.shift} />
          <Field label="Status" value={employee.status.replace("_", " ")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Salary &amp; Bank</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Basic salary" value={employee.basicSalary && Number(employee.basicSalary.toString()).toLocaleString()} />
          <Field label="Allowances" value={employee.allowances && Number(employee.allowances.toString()).toLocaleString()} />
          <Field label="Bank name" value={employee.bankName} />
          <Field label="Bank account no." value={employee.bankAccountNo} />
          <Field label="IFSC" value={employee.bankIfsc} />
          <Field label="PAN" value={employee.pan} />
          <Field label="Aadhaar" value={employee.aadhaar} />
          <Field label="PF number" value={employee.pfNumber} />
          <Field label="ESI number" value={employee.esiNumber} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Name" value={employee.emergencyContactName} />
          <Field label="Relationship" value={employee.emergencyContactRelationship} />
          <Field label="Phone" value={employee.emergencyContactPhone} />
        </CardContent>
      </Card>
    </div>
  )
}
