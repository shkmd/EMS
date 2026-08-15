import "server-only"

import { StyleSheet, Text, View, Image } from "@react-pdf/renderer"

import { getCompanySettings } from "@/features/settings/queries"
import { readUploadedFile } from "@/lib/storage"

export type CompanyLetterheadInfo = {
  companyName: string
  address: string | null
  logoDataUri: string | null
}

// react-pdf's <Image> only natively decodes png/jpg — a webp logo (allowed
// elsewhere in the app) would silently fail to render, so this falls back
// to a text-only letterhead rather than crashing document generation.
const RENDERABLE_LOGO_EXTENSIONS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
}

export async function getCompanyLetterheadInfo(): Promise<CompanyLetterheadInfo> {
  const settings = await getCompanySettings()

  let logoDataUri: string | null = null
  if (settings.logoUrl) {
    const ext = settings.logoUrl.slice(settings.logoUrl.lastIndexOf(".")).toLowerCase()
    const mime = RENDERABLE_LOGO_EXTENSIONS[ext]
    if (mime) {
      try {
        const buffer = await readUploadedFile(settings.logoUrl)
        logoDataUri = `data:${mime};base64,${buffer.toString("base64")}`
      } catch (error) {
        console.error("Failed to read company logo for PDF letterhead:", error)
      }
    }
  }

  return { companyName: settings.companyName, address: settings.address, logoDataUri }
}

export const sharedStyles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", lineHeight: 1.5 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24, borderBottomWidth: 2, borderBottomColor: "#111", paddingBottom: 12 },
  logo: { width: 40, height: 40, objectFit: "contain" },
  companyName: { fontSize: 16, fontWeight: 700 },
  muted: { color: "#666", fontSize: 9 },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 4, textAlign: "center", textDecoration: "underline" },
  dateLine: { fontSize: 10, color: "#666", marginBottom: 20, textAlign: "right" },
  paragraph: { marginBottom: 12, textAlign: "justify" },
  signatureBlock: { marginTop: 48 },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 8, color: "#999", textAlign: "center" },
})

export function Letterhead({ company }: { company: CompanyLetterheadInfo }) {
  return (
    <View style={sharedStyles.header}>
      {/* react-pdf's Image (PDF rendering), not an HTML img — no alt concept */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      {company.logoDataUri && <Image src={company.logoDataUri} style={sharedStyles.logo} />}
      <View>
        <Text style={sharedStyles.companyName}>{company.companyName}</Text>
        {company.address && <Text style={sharedStyles.muted}>{company.address}</Text>}
      </View>
    </View>
  )
}

export function DocumentFooter({ companyName }: { companyName: string }) {
  return <Text style={sharedStyles.footer}>This is a system-generated document from {companyName}&apos;s EMS portal.</Text>
}
