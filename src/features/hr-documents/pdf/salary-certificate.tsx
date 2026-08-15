import "server-only"

import { Document, Page, Text, View } from "@react-pdf/renderer"
import { format } from "date-fns"

import { sharedStyles, Letterhead, DocumentFooter, type CompanyLetterheadInfo } from "@/features/hr-documents/pdf/shared"

type SalaryCertificateData = {
  firstName: string
  lastName: string
  employeeCode: string
  designationTitle: string | null
  departmentName: string | null
  dateOfJoining: Date
  basicSalary: number | null
  grossSalary: number | null
  currency: string
}

function formatMoney(n: number, currency: string) {
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function SalaryCertificateDocument({ data, company }: { data: SalaryCertificateData; company: CompanyLetterheadInfo }) {
  const fullName = `${data.firstName} ${data.lastName}`
  const role = data.designationTitle ?? "an employee"
  const dept = data.departmentName ? ` in the ${data.departmentName} department` : ""

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <Letterhead company={company} />
        <Text style={sharedStyles.dateLine}>Date: {format(new Date(), "dd MMMM yyyy")}</Text>
        <Text style={sharedStyles.title}>SALARY CERTIFICATE</Text>

        <Text style={sharedStyles.paragraph}>TO WHOMSOEVER IT MAY CONCERN</Text>

        <Text style={sharedStyles.paragraph}>
          This is to certify that {fullName} (Employee Code: {data.employeeCode}) is currently employed with{" "}
          {company.companyName}
          {dept} as {role}, since {format(data.dateOfJoining, "dd MMMM yyyy")}.
        </Text>

        <View style={{ marginBottom: 16, marginTop: 8 }}>
          <Text>
            Basic Salary: {data.basicSalary != null ? formatMoney(data.basicSalary, data.currency) : "—"} per month
          </Text>
          {data.grossSalary != null && (
            <Text style={{ marginTop: 4 }}>Gross Salary: {formatMoney(data.grossSalary, data.currency)} per month</Text>
          )}
        </View>

        <Text style={sharedStyles.paragraph}>
          This certificate is issued upon the employee&apos;s request for whatever purpose it may serve.
        </Text>

        <View style={sharedStyles.signatureBlock}>
          <Text>For {company.companyName}</Text>
          <Text style={{ marginTop: 32 }}>Authorized Signatory</Text>
        </View>

        <DocumentFooter companyName={company.companyName} />
      </Page>
    </Document>
  )
}

export { SalaryCertificateDocument }
export type { SalaryCertificateData }
