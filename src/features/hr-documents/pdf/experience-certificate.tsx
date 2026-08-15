import "server-only"

import { Document, Page, Text, View } from "@react-pdf/renderer"
import { format } from "date-fns"

import { sharedStyles, Letterhead, DocumentFooter, type CompanyLetterheadInfo } from "@/features/hr-documents/pdf/shared"

type ExperienceCertificateData = {
  firstName: string
  lastName: string
  employeeCode: string
  designationTitle: string | null
  departmentName: string | null
  dateOfJoining: Date
  lastWorkingDay: Date | null
}

function ExperienceCertificateDocument({
  data,
  company,
}: {
  data: ExperienceCertificateData
  company: CompanyLetterheadInfo
}) {
  const fullName = `${data.firstName} ${data.lastName}`
  const role = data.designationTitle ?? "an employee"
  const dept = data.departmentName ? ` in the ${data.departmentName} department` : ""

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <Letterhead company={company} />
        <Text style={sharedStyles.dateLine}>Date: {format(new Date(), "dd MMMM yyyy")}</Text>
        <Text style={sharedStyles.title}>EXPERIENCE CERTIFICATE</Text>

        <Text style={sharedStyles.paragraph}>TO WHOMSOEVER IT MAY CONCERN</Text>

        {data.lastWorkingDay ? (
          <Text style={sharedStyles.paragraph}>
            This is to certify that {fullName} (Employee Code: {data.employeeCode}) worked with {company.companyName}
            {dept} as {role} from {format(data.dateOfJoining, "dd MMMM yyyy")} to{" "}
            {format(data.lastWorkingDay, "dd MMMM yyyy")}.
          </Text>
        ) : (
          <Text style={sharedStyles.paragraph}>
            This is to certify that {fullName} (Employee Code: {data.employeeCode}) has been working with{" "}
            {company.companyName}
            {dept} as {role} since {format(data.dateOfJoining, "dd MMMM yyyy")} to date.
          </Text>
        )}

        <Text style={sharedStyles.paragraph}>
          During this period, we found {data.firstName} to be sincere, hardworking, and professional in conduct. We
          wish {data.firstName} all the best for future endeavors.
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

export { ExperienceCertificateDocument }
export type { ExperienceCertificateData }
