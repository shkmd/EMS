import { NextRequest, NextResponse } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ValidationError, NotFoundError } from "@/lib/errors"
import { readUploadedFile, mimeTypeFromExtension } from "@/lib/storage"
import { getCompanySettings } from "@/features/settings/queries"
import { uploadSignatureImage } from "@/features/settings/mutations"

// Auth-gated — a public URL for a signature/stamp image would let anyone
// download it and paste it onto a forged document.
export async function GET() {
  try {
    await requireSession()
    const settings = await getCompanySettings()
    if (!settings.signatureImageUrl) throw new NotFoundError("No signature uploaded")

    const buffer = await readUploadedFile(settings.signatureImageUrl)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeTypeFromExtension(settings.signatureImageUrl),
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
    await uploadSignatureImage(file, session, meta)

    return apiSuccess(null, "Signature updated")
  } catch (error) {
    return apiError(error)
  }
}
