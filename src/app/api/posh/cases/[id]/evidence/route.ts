import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { ValidationError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { uploadEvidence } from "@/features/posh/mutations"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) throw new ValidationError("A file is required")

    const evidence = await uploadEvidence(id, file, session)
    return apiSuccess({ evidence }, "Evidence uploaded", 201)
  } catch (error) {
    return apiError(error)
  }
}
