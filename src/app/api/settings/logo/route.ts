import { NextRequest, NextResponse } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ValidationError, NotFoundError } from "@/lib/errors"
import { readUploadedFile, mimeTypeFromExtension } from "@/lib/storage"
import { getCompanySettings } from "@/features/settings/queries"
import { uploadCompanyLogo } from "@/features/settings/mutations"

// Unauthenticated: the logo is shown on the public login page and in the
// sidebar for every signed-in user, so it isn't gated behind a session
// the way employee photos are.
export async function GET() {
  try {
    const settings = await getCompanySettings()
    if (!settings.logoUrl) throw new NotFoundError("No logo uploaded")

    const buffer = await readUploadedFile(settings.logoUrl)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeTypeFromExtension(settings.logoUrl),
        "Cache-Control": "public, max-age=300",
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
    await uploadCompanyLogo(file, session, meta)

    return apiSuccess(null, "Logo updated")
  } catch (error) {
    return apiError(error)
  }
}
