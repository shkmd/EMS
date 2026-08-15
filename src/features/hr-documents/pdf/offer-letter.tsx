import "server-only"

import { Document, Page, Text, View } from "@react-pdf/renderer"
import { format } from "date-fns"

import { sharedStyles, Letterhead, DocumentFooter, type CompanyLetterheadInfo } from "@/features/hr-documents/pdf/shared"

type OfferLetterData = {
  candidateName: string
  position: string
  departmentName: string | null
  proposedSalary: number
  currency: string
  joiningDate: Date
  validUntil: Date | null
}

function formatMoney(n: number, currency: string) {
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function OfferLetterDocument({ data, company }: { data: OfferLetterData; company: CompanyLetterheadInfo }) {
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <Letterhead company={company} />
        <Text style={sharedStyles.dateLine}>Date: {format(new Date(), "dd MMMM yyyy")}</Text>
        <Text style={sharedStyles.title}>OFFER OF EMPLOYMENT</Text>

        <Text style={sharedStyles.paragraph}>Dear {data.candidateName},</Text>

        <Text style={sharedStyles.paragraph}>
          We are pleased to offer you the position of {data.position}
          {data.departmentName && ` in the ${data.departmentName} department`} at {company.companyName}. We were
          impressed with your background and are confident you will be a valuable addition to our team.
        </Text>

        <View style={{ marginBottom: 12 }}>
          <Text>Proposed Compensation: {formatMoney(data.proposedSalary, data.currency)} per month</Text>
          <Text style={{ marginTop: 4 }}>Proposed Joining Date: {format(data.joiningDate, "dd MMMM yyyy")}</Text>
        </View>

        <Text style={sharedStyles.paragraph}>
          This offer, along with detailed terms of employment, will be formalized in your appointment letter upon
          joining.
          {data.validUntil && ` This offer is valid until ${format(data.validUntil, "dd MMMM yyyy")}.`}
        </Text>

        <Text style={sharedStyles.paragraph}>
          Please confirm your acceptance of this offer at your earliest convenience. We look forward to welcoming you
          to {company.companyName}.
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

export { OfferLetterDocument }
export type { OfferLetterData }
