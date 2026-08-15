import "server-only"

import { Document, Page, Text, Image } from "@react-pdf/renderer"
import { format } from "date-fns"

import { sharedStyles, Letterhead, SignatureBlock, DocumentFooter, type CompanyLetterheadInfo } from "@/features/hr-documents/pdf/shared"
import { IMAGE_PLACEHOLDER_TOKEN } from "@/features/hr-documents/templates"

/** Renders any of the 4 generated document types from a title + freeform
 * body — the structure (letterhead, date, title, paragraphs, signature) is
 * identical across all of them; only the wording differs, and that's
 * user-editable (see features/hr-documents/templates.ts). Paragraphs split
 * on blank lines; single newlines within a paragraph are preserved. A
 * paragraph that's exactly the {{templateImage}} token renders the
 * template's attached image (e.g. a seal) as a standalone block instead
 * of text. */
export function GenericDocument({
  title,
  bodyText,
  company,
  imageDataUri,
}: {
  title: string
  bodyText: string
  company: CompanyLetterheadInfo
  imageDataUri?: string | null
}) {
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

        {paragraphs.map((paragraph, i) =>
          paragraph === IMAGE_PLACEHOLDER_TOKEN && imageDataUri ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image key={i} src={imageDataUri} style={sharedStyles.bodyImage} />
          ) : paragraph === IMAGE_PLACEHOLDER_TOKEN ? null : (
            <Text key={i} style={sharedStyles.paragraph}>
              {paragraph}
            </Text>
          )
        )}

        <SignatureBlock company={company} />

        <DocumentFooter companyName={company.companyName} />
      </Page>
    </Document>
  )
}
