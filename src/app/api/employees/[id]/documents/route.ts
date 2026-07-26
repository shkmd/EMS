import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { ValidationError } from "@/lib/errors"
import { uploadEmployeeDocument } from "@/features/employees/mutations"
import { documentTypeValues } from "@/features/employees/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const formData = await req.formData()
    const file = formData.get("file")
    const type = formData.get("type")

    if (!(file instanceof File)) throw new ValidationError("A file is required")
    if (typeof type !== "string" || !documentTypeValues.includes(type as (typeof documentTypeValues)[number])) {
      throw new ValidationError("A valid document type is required")
    }

    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }
    const document = await uploadEmployeeDocument(
      id,
      file,
      type as (typeof documentTypeValues)[number],
      session,
      meta
    )

    return apiSuccess({ document }, "Document uploaded", 201)
  } catch (error) {
    return apiError(error)
  }
}
