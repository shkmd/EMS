import "server-only"

import { Document, Page, Text, View } from "@react-pdf/renderer"
import { format } from "date-fns"

import { sharedStyles, Letterhead, DocumentFooter, type CompanyLetterheadInfo } from "@/features/hr-documents/pdf/shared"

type RelievingLetterData = {
  firstName: string
  lastName: string
  employeeCode: string
  designationTitle: string | null
  departmentName: string | null
  dateOfJoining: Date
  lastWorkingDay: Date
}

function RelievingLetterDocument({ data, company }: { data: RelievingLetterData; company: CompanyLetterheadInfo }) {
  const fullName = `${data.firstName} ${data.lastName}`

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <Letterhead company={company} />
        <Text style={sharedStyles.dateLine}>Date: {format(new Date(), "dd MMMM yyyy")}</Text>
        <Text style={sharedStyles.title}>RELIEVING LETTER</Text>

        <Text style={sharedStyles.paragraph}>
          This is to certify that {fullName} (Employee Code: {data.employeeCode}), who was working with{" "}
          {company.companyName} as {data.designationTitle ?? "an employee"}
          {data.departmentName && ` in the ${data.departmentName} department`}, has been relieved of their duties and
          responsibilities with effect from {format(data.lastWorkingDay, "dd MMMM yyyy")}.
        </Text>

        <Text style={sharedStyles.paragraph}>
          {fullName} was associated with {company.companyName} from {format(data.dateOfJoining, "dd MMMM yyyy")} to{" "}
          {format(data.lastWorkingDay, "dd MMMM yyyy")}. During this period, all dues have been settled and the
          exit formalities have been duly completed.
        </Text>

        <Text style={sharedStyles.paragraph}>We wish {data.firstName} success in all future endeavors.</Text>

        <View style={sharedStyles.signatureBlock}>
          <Text>For {company.companyName}</Text>
          <Text style={{ marginTop: 32 }}>Authorized Signatory</Text>
        </View>

        <DocumentFooter companyName={company.companyName} />
      </Page>
    </Document>
  )
}

export { RelievingLetterDocument }
export type { RelievingLetterData }
