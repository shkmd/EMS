import { NextRequest, NextResponse } from "next/server"

import { apiError } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { readUploadedFile, mimeTypeFromExtension } from "@/lib/storage"
import { getEvidenceFile } from "@/features/posh/queries"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ evidenceId: string }> }) {
  try {
    const session = await requireSession()
    const { evidenceId } = await params

    const evidence = await getEvidenceFile(evidenceId, session)
    const buffer = await readUploadedFile(evidence.fileUrl)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeTypeFromExtension(evidence.fileUrl),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(evidence.fileName)}"`,
      },
    })
  } catch (error) {
    return apiError(error)
  }
}
