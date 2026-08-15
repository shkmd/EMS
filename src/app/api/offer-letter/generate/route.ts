import { NextRequest, NextResponse } from "next/server"

import { requireSession } from "@/features/auth/session"
import { apiError } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { generateOfferLetter } from "@/features/hr-documents/mutations"
import { offerLetterSchema } from "@/features/hr-documents/schemas"

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = offerLetterSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const { buffer, fileName } = await generateOfferLetter(body, session, meta)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    return apiError(error)
  }
}
