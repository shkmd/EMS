import { NextRequest, NextResponse } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ValidationError, NotFoundError } from "@/lib/errors"
import { readUploadedFile, mimeTypeFromExtension } from "@/lib/storage"
import { getCompanySettings } from "@/features/settings/queries"
import { uploadLetterheadImage } from "@/features/settings/mutations"

// Auth-gated (unlike the logo) — the letterhead banner is only ever
// embedded server-side into generated PDFs, never shown on a public page,
// so there's no reason to expose it unauthenticated.
export async function GET() {
  try {
    await requireSession()
    const settings = await getCompanySettings()
    if (!settings.letterheadImageUrl) throw new NotFoundError("No letterhead uploaded")

    const buffer = await readUploadedFile(settings.letterheadImageUrl)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeTypeFromExtension(settings.letterheadImageUrl),
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()

    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) throw new ValidationError("A file is required")

    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }
    await uploadLetterheadImage(file, session, meta)

    return apiSuccess(null, "Letterhead updated")
  } catch (error) {
    return apiError(error)
  }
}
