import "server-only"

import { Document, Page, Text, View } from "@react-pdf/renderer"
import { format } from "date-fns"

import { sharedStyles, Letterhead, DocumentFooter, type CompanyLetterheadInfo } from "@/features/hr-documents/pdf/shared"

/** Renders any of the 4 generated document types from a title + freeform
 * body — the structure (letterhead, date, title, paragraphs, signature) is
 * identical across all of them; only the wording differs, and that's
 * user-editable (see features/hr-documents/templates.ts). Paragraphs split
 * on blank lines; single newlines within a paragraph are preserved. */
export function GenericDocument({ title, bodyText, company }: { title: string; bodyText: string; company: CompanyLetterheadInfo }) {
  const paragraphs = bodyText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <Letterhead company={company} />
        <Text style={sharedStyles.dateLine}>Date: {format(new Date(), "dd MMMM yyyy")}</Text>
        <Text style={sharedStyles.title}>{title}</Text>

        {paragraphs.map((paragraph, i) => (
          <Text key={i} style={sharedStyles.paragraph}>
            {paragraph}
          </Text>
        ))}

        <View style={sharedStyles.signatureBlock}>
          <Text>For {company.companyName}</Text>
          <Text style={{ marginTop: 32 }}>Authorized Signatory</Text>
        </View>

        <DocumentFooter companyName={company.companyName} />
      </Page>
    </Document>
  )
}
