import { NextRequest, NextResponse } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { readUploadedFile, mimeTypeFromExtension } from "@/lib/storage"
import { getCandidate } from "@/features/recruitment/queries"
import { uploadCandidateResume } from "@/features/recruitment/mutations"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params

    const candidate = await getCandidate(id, session)
    if (!candidate.resumeUrl) throw new NotFoundError("No resume on file")

    const buffer = await readUploadedFile(candidate.resumeUrl)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeTypeFromExtension(candidate.resumeUrl),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(candidate.resumeFileName ?? "resume")}"`,
      },
    })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id } = await params

    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) throw new ValidationError("A file is required")

    const candidate = await uploadCandidateResume(id, file, session)
    return apiSuccess({ candidate }, "Resume uploaded")
  } catch (error) {
    return apiError(error)
  }
}
