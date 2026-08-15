import "server-only"

import { StyleSheet, Text, View, Image } from "@react-pdf/renderer"

import { getCompanySettings } from "@/features/settings/queries"
import { readUploadedFile } from "@/lib/storage"

export type CompanyLetterheadInfo = {
  companyName: string
  address: string | null
  logoDataUri: string | null
  letterheadImageDataUri: string | null
  signatureImageDataUri: string | null
}

// react-pdf's <Image> only natively decodes png/jpg — a webp upload
// (allowed elsewhere in the app) would silently fail to render, so this
// falls back to omitting the image rather than crashing document generation.
const RENDERABLE_IMAGE_EXTENSIONS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
}

export async function toDataUri(relativePath: string | null | undefined, context: string): Promise<string | null> {
  if (!relativePath) return null
  const ext = relativePath.slice(relativePath.lastIndexOf(".")).toLowerCase()
  const mime = RENDERABLE_IMAGE_EXTENSIONS[ext]
  if (!mime) return null

  try {
    const buffer = await readUploadedFile(relativePath)
    return `data:${mime};base64,${buffer.toString("base64")}`
  } catch (error) {
    console.error(`Failed to read ${context} for PDF:`, error)
    return null
  }
}

export async function getCompanyLetterheadInfo(): Promise<CompanyLetterheadInfo> {
  const settings = await getCompanySettings()

  const [logoDataUri, letterheadImageDataUri, signatureImageDataUri] = await Promise.all([
    toDataUri(settings.logoUrl, "company logo"),
    toDataUri(settings.letterheadImageUrl, "letterhead image"),
    toDataUri(settings.signatureImageUrl, "signature image"),
  ])

  return { companyName: settings.companyName, address: settings.address, logoDataUri, letterheadImageDataUri, signatureImageDataUri }
}

export const sharedStyles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", lineHeight: 1.5 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24, borderBottomWidth: 2, borderBottomColor: "#111", paddingBottom: 12 },
  logo: { width: 40, height: 40, objectFit: "contain" },
  letterheadBanner: { width: "100%", marginBottom: 24, objectFit: "contain" },
  companyName: { fontSize: 16, fontWeight: 700 },
  muted: { color: "#666", fontSize: 9 },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 4, textAlign: "center", textDecoration: "underline" },
  dateLine: { fontSize: 10, color: "#666", marginBottom: 20, textAlign: "right" },
  paragraph: { marginBottom: 12, textAlign: "justify" },
  bodyImage: { width: 140, marginBottom: 12, objectFit: "contain" },
  signatureBlock: { marginTop: 48 },
  signatureImage: { width: 120, height: 60, objectFit: "contain", marginTop: 8, marginBottom: 4 },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 8, color: "#999", textAlign: "center" },
})

// react-pdf's Image (PDF rendering), not an HTML img — no alt concept, so
// jsx-a11y's alt-text rule is a false positive on every use below.

export function Letterhead({ company }: { company: CompanyLetterheadInfo }) {
  if (company.letterheadImageDataUri) {
    return (
      // eslint-disable-next-line jsx-a11y/alt-text
      <Image src={company.letterheadImageDataUri} style={sharedStyles.letterheadBanner} />
    )
  }

  return (
    <View style={sharedStyles.header}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      {company.logoDataUri && <Image src={company.logoDataUri} style={sharedStyles.logo} />}
      <View>
        <Text style={sharedStyles.companyName}>{company.companyName}</Text>
        {company.address && <Text style={sharedStyles.muted}>{company.address}</Text>}
      </View>
    </View>
  )
}

export function SignatureBlock({ company }: { company: CompanyLetterheadInfo }) {
  return (
    <View style={sharedStyles.signatureBlock}>
      <Text>For {company.companyName}</Text>
      {company.signatureImageDataUri ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image src={company.signatureImageDataUri} style={sharedStyles.signatureImage} />
      ) : (
        <View style={{ marginTop: 32 }} />
      )}
      <Text>Authorized Signatory</Text>
    </View>
  )
}

export function DocumentFooter({ companyName }: { companyName: string }) {
  return <Text style={sharedStyles.footer}>This is a system-generated document from {companyName}&apos;s EMS portal.</Text>
}
